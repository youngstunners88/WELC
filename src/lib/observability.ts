/**
 * Minimal observability shim (checklist LOG001).
 *
 * Production error visibility without committing to a specific vendor yet. It
 * always logs to the console (captured by Vercel's function/runtime logs), and
 * if a Sentry-style DSN is configured it POSTs a compact event to an ingest
 * endpoint. Wire a real SDK later by replacing the body of `captureError` — the
 * call sites (global-error boundary, API catch blocks) stay the same.
 *
 * No secrets are read on the client: only NEXT_PUBLIC_ERROR_INGEST_URL, which
 * is a public ingest URL by design, is used browser-side.
 */

type Context = Record<string, unknown>;

export function captureError(error: unknown, context: Context = {}): void {
  const payload = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    at: new Date().toISOString(),
    url:
      typeof window !== "undefined" ? window.location.href : context.url ?? null,
  };

  // Always land in logs — this is what turns "the site is glitchy" into an
  // actual stack trace you can read in Vercel.
  // eslint-disable-next-line no-console
  console.error("[capture]", payload.message, payload);

  const ingest = process.env.NEXT_PUBLIC_ERROR_INGEST_URL;
  if (ingest && typeof fetch !== "undefined") {
    try {
      // Fire-and-forget; never let telemetry throw into the caller.
      void fetch(ingest, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }
}
