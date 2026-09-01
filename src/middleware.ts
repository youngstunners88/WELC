import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const ALLOWED_ORIGINS = new Set([
  "https://welc-academy.vercel.app",
  "http://localhost:3000",
]);

/**
 * True when the request is safe to serve with CORS credentials. Two cases:
 *  1. Same-origin — the app calling its own /api from a page it served. This is
 *     the common case and must ALWAYS be allowed, whatever domain the app is
 *     deployed on (prod, a Vercel preview/branch URL, or a per-deploy URL).
 *     Hardcoding a single prod domain used to 403 every API POST on those other
 *     domains, which read as random breakage to the user.
 *  2. An explicit cross-origin entry in ALLOWED_ORIGINS.
 */
function isAllowedOrigin(origin: string, request: NextRequest): boolean {
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    // Same-origin: the Origin host equals the host the request came in on.
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

function corsHeaders(
  origin: string | null,
  request: NextRequest
): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
  if (origin && isAllowedOrigin(origin, request)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

/**
 * Content-Security-Policy, generated fresh per request with a random nonce.
 *
 * This MUST be per-request (not a static header from next.config.mjs) because
 * the App Router injects inline <script> tags to stream React hydration data
 * (`self.__next_f.push(...)`) into every page. A `script-src 'self'` policy
 * with no 'unsafe-inline' and no nonce makes every modern browser silently
 * block those inline scripts — the server-rendered HTML still looks perfect,
 * but React never hydrates, so no click handler on the entire site ever
 * fires. That was a real, live bug: it looked like "nothing works" (buttons,
 * forms, OAuth — everything render-only) while every backend check passed.
 *
 * The nonce is threaded through via the `x-nonce` request header; Next.js's
 * own App Router runtime automatically applies it to the inline scripts it
 * emits when it sees this pattern (response CSP header + forwarded request
 * header), so no changes are needed in layout.tsx for Next's own scripts.
 */
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://*.supabase.co",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── API routes: origin allow-list + a general per-IP request ceiling ────
  // Same-origin browser requests (the app calling its own /api/*) are
  // unaffected — the Origin header on those always matches an allowed value.
  if (pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");

    if (origin && !isAllowedOrigin(origin, request)) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: corsHeaders(origin, request),
      });
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const { ok } = rateLimit(`api:${ip}`, 30, 60_000); // 30 req/min/IP baseline
    if (!ok) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down and try again shortly." },
        { status: 429, headers: corsHeaders(origin, request) }
      );
    }

    const apiResponse = NextResponse.next({ request });
    for (const [k, v] of Object.entries(corsHeaders(origin, request))) {
      apiResponse.headers.set(k, v);
    }
    return apiResponse;
  }

  // ── Every other route: nonce'd CSP + the existing page-auth check ────────
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (
          toSet: { name: string; value: string; options?: CookieOptions }[]
        ) =>
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          ),
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = [
    "/owner",
    "/teacher",
    "/student",
    "/settings",
    "/calendar",
    "/messages",
    "/mfa",
  ].some((p) => request.nextUrl.pathname.startsWith(p));

  if (isProtected && !user) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimization files — CSP (and
    // the auth check, for protected paths) must run on every real page,
    // including /login, /, /legal/*, /auth/callback, which the old matcher
    // skipped.
    "/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.*).*)",
  ],
};
