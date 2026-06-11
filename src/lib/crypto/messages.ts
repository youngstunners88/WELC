import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "crypto";

/**
 * Application-layer message encryption (AES-256-GCM).
 *
 * The database stores only ciphertext; this module is the single place that
 * holds plaintext, and it runs server-side only (`server-only` import guard).
 *
 * Key: MESSAGE_ENCRYPTION_KEY — ideally 32 raw bytes encoded as base64. Any
 * other non-empty string is accepted and hardened into a 32-byte key via
 * SHA-256 so the platform still works if the owner pastes a passphrase. If the
 * variable is missing, messaging is treated as "not configured" and the UI
 * degrades gracefully rather than ever writing plaintext.
 *
 * Wire format:  v1.<ivB64url>.<tagB64url>.<cipherB64url>
 */

const VERSION = "v1";

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function getKey(): Buffer | null {
  const raw = process.env.MESSAGE_ENCRYPTION_KEY;
  if (!raw || raw.trim() === "") return null;
  // Prefer a real 32-byte base64 key; otherwise derive one deterministically.
  try {
    const decoded = Buffer.from(raw, "base64");
    if (decoded.length === 32) return decoded;
  } catch {
    /* fall through to hash */
  }
  return createHash("sha256").update(raw, "utf8").digest();
}

export function isMessagingConfigured(): boolean {
  return getKey() !== null;
}

export function encryptMessage(plaintext: string): string {
  const key = getKey();
  if (!key) {
    throw new Error("MESSAGE_ENCRYPTION_KEY is not configured");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${VERSION}.${b64url(iv)}.${b64url(tag)}.${b64url(ct)}`;
}

/**
 * Decrypts a stored payload. Never throws on bad input — returns a safe
 * placeholder so one corrupt row can't blank an entire thread.
 */
export function decryptMessage(payload: string): string {
  const key = getKey();
  if (!key) return "🔒 (encrypted)";
  try {
    const [version, ivB64, tagB64, ctB64] = payload.split(".");
    if (version !== VERSION || !ivB64 || !tagB64 || !ctB64) {
      return "🔒 (unreadable)";
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivB64, "base64url")
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    const pt = Buffer.concat([
      decipher.update(Buffer.from(ctB64, "base64url")),
      decipher.final(),
    ]);
    return pt.toString("utf8");
  } catch {
    return "🔒 (unreadable)";
  }
}
