import { describe, it, expect } from "vitest";
import { safeUrl } from "./safeUrl";

describe("safeUrl", () => {
  it("passes through ordinary meeting links unchanged", () => {
    expect(safeUrl("https://zoom.us/j/1234567890?pwd=abc")).toBe(
      "https://zoom.us/j/1234567890?pwd=abc"
    );
    expect(safeUrl("http://meet.example.com/room")).toBe(
      "http://meet.example.com/room"
    );
  });

  it("blocks javascript: — the reason this helper exists (a meeting link is owner-supplied and lands in an href)", () => {
    expect(safeUrl("javascript:alert(document.cookie)")).toBeUndefined();
    expect(safeUrl("JavaScript:alert(1)")).toBeUndefined();
    expect(safeUrl("JAVASCRIPT:alert(1)")).toBeUndefined();
  });

  it("blocks javascript: hidden behind leading whitespace and control characters, which the URL parser strips before parsing", () => {
    const tab = String.fromCodePoint(0x09);
    const newline = String.fromCodePoint(0x0a);
    const nul = String.fromCodePoint(0x00);
    expect(safeUrl("  javascript:alert(1)")).toBeUndefined();
    expect(safeUrl(`java${newline}script:alert(1)`)).toBeUndefined();
    expect(safeUrl(`java${tab}script:alert(1)`)).toBeUndefined();
    expect(safeUrl(`${nul}javascript:alert(1)`)).toBeUndefined();
  });

  it("blocks the other classic href schemes", () => {
    expect(safeUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")).toBeUndefined();
    expect(safeUrl("vbscript:msgbox(1)")).toBeUndefined();
    expect(safeUrl("file:///etc/passwd")).toBeUndefined();
    expect(safeUrl("blob:https://evil.example/uuid")).toBeUndefined();
  });

  it("returns undefined for empty, null and undefined links rather than an empty href", () => {
    expect(safeUrl(null)).toBeUndefined();
    expect(safeUrl(undefined)).toBeUndefined();
    expect(safeUrl("")).toBeUndefined();
  });

  it("rejects strings that are not absolute URLs at all", () => {
    expect(safeUrl("not a url")).toBeUndefined();
    expect(safeUrl("/relative/path")).toBeUndefined();
    expect(safeUrl("zoom.us/j/123")).toBeUndefined();
    expect(safeUrl("//protocol-relative.example.com")).toBeUndefined();
  });

  it("accepts an uppercase scheme, which the URL parser normalises", () => {
    expect(safeUrl("HTTPS://zoom.us/j/1")).toBe("HTTPS://zoom.us/j/1");
  });

  it("does not rewrite the caller's string — the href rendered is the one stored", () => {
    const url = "https://zoom.us/j/1?a=1&b=%20space";
    expect(safeUrl(url)).toBe(url);
  });
});
