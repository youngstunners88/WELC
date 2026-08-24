import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const ALLOWED_ORIGINS = new Set([
  "https://welc-academy.vercel.app",
  "http://localhost:3000",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── API routes: origin allow-list + a general per-IP request ceiling ────
  // Same-origin browser requests (the app calling its own /api/*) are
  // unaffected — the Origin header on those always matches an allowed value.
  if (pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");

    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const { ok } = rateLimit(`api:${ip}`, 30, 60_000); // 30 req/min/IP baseline
    if (!ok) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down and try again shortly." },
        { status: 429, headers: corsHeaders(origin) }
      );
    }

    const apiResponse = NextResponse.next({ request });
    for (const [k, v] of Object.entries(corsHeaders(origin))) {
      apiResponse.headers.set(k, v);
    }
    return apiResponse;
  }

  const response = NextResponse.next({ request });

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
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/owner/:path*",
    "/teacher/:path*",
    "/student/:path*",
    "/settings/:path*",
    "/calendar/:path*",
    "/messages/:path*",
    "/mfa/:path*",
    "/api/:path*",
  ],
};
