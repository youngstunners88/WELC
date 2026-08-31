"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/observability";

/**
 * App-wide error boundary. Catches render/runtime errors that would otherwise
 * blank the page and reports them through the observability shim so production
 * failures are visible (checklist LOG001) instead of silently swallowed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { boundary: "global-error", digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#f8f7f4",
          color: "#0f1e4a",
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: "#5b6472", marginBottom: 20 }}>
            죄송합니다. 문제가 발생했습니다. · Sorry, an unexpected error
            occurred. You can try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#0f1e4a",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
