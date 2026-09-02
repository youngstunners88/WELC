/**
 * Message-body validation, shared by every owner↔member messaging action.
 *
 * Kept out of the server action so it can be unit-tested: this is the only
 * thing standing between a user's keystrokes and `encryptMessage`, and an
 * empty or oversized body must be rejected *before* it is encrypted and sent
 * to an RPC that fans it out to every member.
 */
export const MAX_MESSAGE_LEN = 2000;

export type MessageBodyResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

export function validateMessageBody(body: string): MessageBodyResult {
  const text = body.trim();
  if (!text) return { ok: false, error: "Message is required" };
  if (text.length > MAX_MESSAGE_LEN) {
    return { ok: false, error: "Message is too long" };
  }
  return { ok: true, text };
}
