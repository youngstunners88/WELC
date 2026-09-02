import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { isAllowedOrigin, corsHeaders as buildCorsHeaders, buildCsp } from "@/lib/security-headers";

// Thin wrapper so call sites below don't need to plumb `request.headers.get("host")`
// through every call — the actual logic lives in src/lib/security-headers.ts,
// which is unit-tested directly (no NextRequest needed there).
function corsHeaders(origin: string | null, request: NextRequest) {
  return buildCorsHeaders(origin, request.headers.get("host"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── API routes: origin allow-list + a general per-IP request ceiling ────
  // Same-origin browser requests (the app calling its own /api/*) are
  // unaffected — the Origin header on those always matches an allowed value.
  if (pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");

    if (origin && !isAllowedOrigin(origin, request.headers.get("host"))) {
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
