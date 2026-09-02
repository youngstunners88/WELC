import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomBytes } from "node:crypto";
import {
  encryptMessage,
  decryptMessage,
  isMessagingConfigured,
} from "./messages";

// A real 32-byte key, base64-encoded — the shape the deployment is meant to use.
const KEY_A = randomBytes(32).toString("base64");
const KEY_B = randomBytes(32).toString("base64");

const originalKey = process.env.MESSAGE_ENCRYPTION_KEY;

function setKey(value: string | undefined) {
  if (value === undefined) delete process.env.MESSAGE_ENCRYPTION_KEY;
  else process.env.MESSAGE_ENCRYPTION_KEY = value;
}

beforeEach(() => setKey(KEY_A));
afterEach(() => setKey(originalKey));

describe("isMessagingConfigured", () => {
  it("is false when the key is missing, so the UI can degrade instead of writing plaintext", () => {
    setKey(undefined);
    expect(isMessagingConfigured()).toBe(false);
  });

  it("is false for a whitespace-only key — an env var set to empty is not configuration", () => {
    setKey("   ");
    expect(isMessagingConfigured()).toBe(false);
  });

  it("is true for a base64 32-byte key and for a plain passphrase", () => {
    setKey(KEY_A);
    expect(isMessagingConfigured()).toBe(true);
    setKey("a passphrase the owner pasted in");
    expect(isMessagingConfigured()).toBe(true);
  });
});

describe("encryptMessage / decryptMessage round-trip", () => {
  it("returns the exact plaintext it was given", () => {
    const plaintext = "Tomorrow's class moves to 7pm.";
    expect(decryptMessage(encryptMessage(plaintext))).toBe(plaintext);
  });

  it("round-trips Korean, emoji and newlines byte-for-byte", () => {
    const plaintext = "안녕하세요 위준성 영어\n내일 수업 7시로 변경합니다 🙂";
    expect(decryptMessage(encryptMessage(plaintext))).toBe(plaintext);
  });

  it("round-trips a message at the 2000-char limit the actions enforce", () => {
    const plaintext = "가".repeat(2000);
    expect(decryptMessage(encryptMessage(plaintext))).toBe(plaintext);
  });

  it("never emits the plaintext inside the stored payload", () => {
    const plaintext = "SECRET-PHONE-010-1234-5678";
    const payload = encryptMessage(plaintext);
    expect(payload).not.toContain(plaintext);
    expect(Buffer.from(payload, "utf8").includes(plaintext)).toBe(false);
  });

  it("uses a fresh IV per call, so identical messages do not produce identical ciphertext", () => {
    const a = encryptMessage("same text");
    const b = encryptMessage("same text");
    expect(a).not.toBe(b);
    expect(decryptMessage(a)).toBe("same text");
    expect(decryptMessage(b)).toBe("same text");
  });

  it("emits the documented v1.iv.tag.ciphertext wire format", () => {
    const parts = encryptMessage("hello").split(".");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("v1");
    expect(Buffer.from(parts[1], "base64url")).toHaveLength(12); // GCM IV
    expect(Buffer.from(parts[2], "base64url")).toHaveLength(16); // GCM tag
    // base64url only — the payload goes into a DB column and a JSON response.
    expect(parts.slice(1).join("")).toMatch(/^[A-Za-z0-9_-]*$/);
  });

  it("throws rather than storing plaintext when the key is missing", () => {
    setKey(undefined);
    expect(() => encryptMessage("must not be stored")).toThrow(
      /MESSAGE_ENCRYPTION_KEY/
    );
  });
});

describe("decryptMessage — tampering and corruption", () => {
  it("rejects a flipped ciphertext byte instead of returning garbage (GCM auth tag)", () => {
    const payload = encryptMessage("Pay the teacher 500,000 KRW");
    const [v, iv, tag, ct] = payload.split(".");
    const bytes = Buffer.from(ct, "base64url");
    bytes[0] ^= 0x01;
    const tampered = [v, iv, tag, bytes.toString("base64url")].join(".");
    expect(decryptMessage(tampered)).toBe("🔒 (unreadable)");
  });

  it("rejects a swapped authentication tag", () => {
    const a = encryptMessage("message one").split(".");
    const b = encryptMessage("message two").split(".");
    const forged = [a[0], a[1], b[2], a[3]].join(".");
    expect(decryptMessage(forged)).toBe("🔒 (unreadable)");
  });

  it("rejects a swapped IV", () => {
    const a = encryptMessage("message one").split(".");
    const b = encryptMessage("message two").split(".");
    const forged = [a[0], b[1], a[2], a[3]].join(".");
    expect(decryptMessage(forged)).toBe("🔒 (unreadable)");
  });

  it("cannot be downgraded by rewriting the version prefix", () => {
    const payload = encryptMessage("secret");
    expect(decryptMessage(payload.replace(/^v1/, "v0"))).toBe("🔒 (unreadable)");
  });

  it("returns a placeholder for malformed payloads instead of throwing — one corrupt row must not blank a thread", () => {
    for (const bad of [
      "",
      "not-a-payload",
      "v1",
      "v1..",
      "v1.a.b",
      "v1.a.b.c",
      "v1.!!!.???.###",
    ]) {
      expect(decryptMessage(bad)).toBe("🔒 (unreadable)");
    }
  });
});

describe("decryptMessage — wrong key", () => {
  it("does not reveal a message encrypted under a different key", () => {
    setKey(KEY_A);
    const payload = encryptMessage("owner-only note");
    setKey(KEY_B);
    expect(decryptMessage(payload)).toBe("🔒 (unreadable)");
    setKey(KEY_A);
    expect(decryptMessage(payload)).toBe("owner-only note");
  });

  it("shows the 'encrypted' placeholder (not 'unreadable') when the key is simply absent", () => {
    const payload = encryptMessage("owner-only note");
    setKey(undefined);
    expect(decryptMessage(payload)).toBe("🔒 (encrypted)");
  });
});

describe("key derivation", () => {
  it("accepts a non-base64 passphrase and derives a stable key from it", () => {
    setKey("위준성 영어 라이프 컨설팅 passphrase");
    const payload = encryptMessage("works without a generated key");
    expect(decryptMessage(payload)).toBe("works without a generated key");
  });

  it("treats a base64 32-byte key and its raw bytes as the same key", () => {
    const raw = randomBytes(32);
    setKey(raw.toString("base64"));
    const payload = encryptMessage("same key, two spellings");
    setKey(raw.toString("base64"));
    expect(decryptMessage(payload)).toBe("same key, two spellings");
  });

  it("derives different keys from different passphrases", () => {
    setKey("passphrase one");
    const payload = encryptMessage("cross-key leak check");
    setKey("passphrase two");
    expect(decryptMessage(payload)).toBe("🔒 (unreadable)");
  });
});
