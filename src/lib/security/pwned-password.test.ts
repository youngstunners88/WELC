import { describe, it, expect, vi } from "vitest";
import {
  hashPassword,
  findSuffix,
  isPasswordPwned,
} from "./pwned-password";

describe("hashPassword", () => {
  it("splits the SHA-1 into a 5-char prefix and the remaining suffix", () => {
    const { prefix, suffix } = hashPassword("password123");
    expect(prefix).toHaveLength(5);
    expect(suffix).toHaveLength(35);
    // Known SHA-1 of "password123", uppercased.
    expect(prefix + suffix).toBe("CBFDAC6008F9CAB4083784CBD1874F76618D2A97");
  });

  it("never returns the password itself", () => {
    const { prefix, suffix } = hashPassword("hunter2");
    expect(prefix + suffix).not.toContain("hunter2");
  });
});

describe("findSuffix", () => {
  const body = [
    "0018A45C4D1DEF81644B54AB7F969B88D65:1",
    "00D4F6E8FA6EECAD2A3AA415EEC418D38EC:2",
    "011053FD0102E94D6AE2F8B83D76FAF94F6:5",
  ].join("\n");

  it("returns the breach count when the suffix is present", () => {
    expect(findSuffix(body, "00D4F6E8FA6EECAD2A3AA415EEC418D38EC")).toBe(2);
  });

  it("returns 0 when the suffix is absent", () => {
    expect(findSuffix(body, "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF")).toBe(0);
  });

  it("tolerates CRLF line endings from the API", () => {
    const crlf = body.split("\n").join("\r\n");
    expect(findSuffix(crlf, "011053FD0102E94D6AE2F8B83D76FAF94F6")).toBe(5);
  });

  it("does not treat a malformed count as a match value", () => {
    expect(findSuffix("ABC:notanumber", "ABC")).toBe(0);
  });
});

describe("isPasswordPwned", () => {
  it("flags a password present in the corpus", async () => {
    const { suffix } = hashPassword("password123");
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `${suffix}:2266543`,
    } as Response);

    const res = await isPasswordPwned("password123", fakeFetch as never);
    expect(res.pwned).toBe(true);
    expect(res.count).toBe(2266543);
    expect(res.checkFailed).toBe(false);
  });

  it("passes a password absent from the corpus", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "0000000000000000000000000000000000A:3",
    } as Response);

    const res = await isPasswordPwned("a-long-unique-passphrase", fakeFetch as never);
    expect(res.pwned).toBe(false);
    expect(res.checkFailed).toBe(false);
  });

  it("sends only the 5-character prefix, never the password or full hash", async () => {
    const password = "correct horse battery staple";
    const { prefix, suffix } = hashPassword(password);
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "",
    } as Response);

    await isPasswordPwned(password, fakeFetch as never);

    const calledUrl = String(fakeFetch.mock.calls[0][0]);
    expect(calledUrl).toContain(prefix);
    expect(calledUrl).not.toContain(password);
    expect(calledUrl).not.toContain(suffix);
  });

  it("FAILS OPEN when HIBP returns an error status — an outage must not block enrolment", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: false } as Response);
    const res = await isPasswordPwned("anything", fakeFetch as never);
    expect(res.pwned).toBe(false);
    expect(res.checkFailed).toBe(true);
  });

  it("FAILS OPEN when the request throws (network down, timeout)", async () => {
    const fakeFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await isPasswordPwned("anything", fakeFetch as never);
    expect(res.pwned).toBe(false);
    expect(res.checkFailed).toBe(true);
  });

  it("requests padding so response size leaks nothing", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "",
    } as Response);
    await isPasswordPwned("x", fakeFetch as never);
    const init = fakeFetch.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["Add-Padding"]).toBe("true");
  });
});
