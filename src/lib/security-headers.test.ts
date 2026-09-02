import { describe, it, expect } from "vitest";
import { isAllowedOrigin, corsHeaders, buildCsp } from "./security-headers";

describe("isAllowedOrigin", () => {
  it("allows the explicit production origin", () => {
    expect(isAllowedOrigin("https://welc-academy.vercel.app", "anything")).toBe(
      true
    );
  });

  it("allows localhost for local dev", () => {
    expect(isAllowedOrigin("http://localhost:3000", "anything")).toBe(true);
  });

  it("allows same-origin requests on ANY host — this is the exact fix for the bug where every Vercel preview/branch/per-deploy domain 403'd", () => {
    const host = "welc-academy-git-some-branch-team.vercel.app";
    expect(isAllowedOrigin(`https://${host}`, host)).toBe(true);
  });

  it("rejects a cross-origin request from an unrelated domain", () => {
    expect(
      isAllowedOrigin("https://evil.example.com", "welc-academy.vercel.app")
    ).toBe(false);
  });

  it("rejects a request with no matching host (no Origin spoofing via a bad host header)", () => {
    expect(isAllowedOrigin("https://welc-academy.vercel.app.evil.com", null)).toBe(
      false
    );
  });

  it("does not throw on a malformed origin", () => {
    expect(isAllowedOrigin("not a url", "welc-academy.vercel.app")).toBe(false);
  });
});

describe("corsHeaders", () => {
  it("echoes the origin back when allowed", () => {
    const headers = corsHeaders(
      "https://welc-academy.vercel.app",
      "welc-academy.vercel.app"
    );
    expect(headers["Access-Control-Allow-Origin"]).toBe(
      "https://welc-academy.vercel.app"
    );
  });

  it("omits Access-Control-Allow-Origin when the origin isn't allowed", () => {
    const headers = corsHeaders("https://evil.example.com", "welc-academy.vercel.app");
    expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("always sets Vary: Origin so caches don't leak a permissive response to a disallowed origin", () => {
    const headers = corsHeaders(null, "welc-academy.vercel.app");
    expect(headers.Vary).toBe("Origin");
  });
});

describe("buildCsp", () => {
  it("embeds the given nonce into script-src", () => {
    const csp = buildCsp("abc123");
    expect(csp).toContain("'nonce-abc123'");
  });

  it("does not include unsafe-inline for scripts — that would defeat the nonce", () => {
    const csp = buildCsp("abc123");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  it("still allows Supabase Realtime's websocket connection", () => {
    const csp = buildCsp("abc123");
    expect(csp).toMatch(/connect-src[^;]*wss:\/\/\*\.supabase\.co/);
  });
});
