// Pure CORS/CSP logic, factored out of middleware.ts so it's testable without
// spinning up a NextRequest/NextResponse — middleware.ts wires this to the
// actual request/response objects.

export const ALLOWED_ORIGINS = new Set([
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
export function isAllowedOrigin(origin: string, host: string | null): boolean {
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    // Same-origin: the Origin host equals the host the request came in on.
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function corsHeaders(
  origin: string | null,
  host: string | null
): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
  if (origin && isAllowedOrigin(origin, host)) {
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
export function buildCsp(nonce: string): string {
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
