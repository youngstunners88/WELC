import { describe, it, expect } from "vitest";
import { validateMessageBody, MAX_MESSAGE_LEN } from "./messages";

describe("validateMessageBody", () => {
  it("accepts an ordinary message and returns it trimmed", () => {
    const r = validateMessageBody("  내일 수업 7시로 변경합니다  ");
    expect(r).toEqual({ ok: true, text: "내일 수업 7시로 변경합니다" });
  });

  it("rejects an empty or whitespace-only body — a broadcast fans out to every member, so a blank one must never be encrypted and sent", () => {
    for (const body of ["", "   ", "\n\t  \n"]) {
      expect(validateMessageBody(body)).toEqual({
        ok: false,
        error: "Message is required",
      });
    }
  });

  it("measures length after trimming, so trailing whitespace cannot push a valid message over the limit", () => {
    const body = "a".repeat(MAX_MESSAGE_LEN) + "    ";
    const r = validateMessageBody(body);
    expect(r.ok).toBe(true);
  });

  it("accepts exactly the limit and rejects one character more", () => {
    expect(validateMessageBody("a".repeat(MAX_MESSAGE_LEN)).ok).toBe(true);
    expect(validateMessageBody("a".repeat(MAX_MESSAGE_LEN + 1))).toEqual({
      ok: false,
      error: "Message is too long",
    });
  });

  it("counts Korean characters as one each, so a Korean notice is not cut short", () => {
    expect(validateMessageBody("공".repeat(MAX_MESSAGE_LEN)).ok).toBe(true);
  });
});
