import { createHash } from "node:crypto";

/**
 * Leaked-password checking against Have I Been Pwned's Pwned Passwords range
 * API.
 *
 * WHY THIS IS HERE: Supabase offers this natively, but it is gated behind a
 * paid plan — the Management API returns HTTP 402 when enabling it on this
 * project. The underlying HIBP range API is free and needs no key, so the
 * check is implemented in the app instead. Same protection, no plan change.
 *
 * PRIVACY: the password never leaves this process, and neither does its full
 * hash. Only the first 5 hex characters of the SHA-1 are sent; HIBP returns
 * every suffix sharing that prefix (~800-3000 of them) and the comparison
 * happens locally. This is HIBP's documented k-anonymity model. The
 * `Add-Padding` header makes the response a uniform size so the count of
 * returned hashes can't be used to infer anything either.
 *
 * SHA-1 is not a security choice here — it is the digest HIBP's corpus is
 * indexed by. It is never used to store anything.
 */

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range";
const TIMEOUT_MS = 2500;

export interface PwnedCheck {
  /** True only when the password was positively found in a breach corpus. */
  pwned: boolean;
  /** How many times it appears. 0 when not found or when the check failed. */
  count: number;
  /**
   * True when the check could not be completed (HIBP unreachable, timeout,
   * unexpected response). Callers MUST treat this as "allow" — see below.
   */
  checkFailed: boolean;
}

/**
 * Split a SHA-1 hex digest the way the range API expects.
 * Exported for testing; not useful on its own.
 */
export function hashPassword(password: string): {
  prefix: string;
  suffix: string;
} {
  const sha1 = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  return { prefix: sha1.slice(0, 5), suffix: sha1.slice(5) };
}

/**
 * Parse a range-API response body and find our suffix.
 * Exported so the parsing can be tested without a network call.
 */
export function findSuffix(body: string, suffix: string): number {
  for (const line of body.split("\n")) {
    const [hash, count] = line.trim().split(":");
    if (hash === suffix) {
      const n = Number.parseInt(count ?? "0", 10);
      return Number.isFinite(n) ? n : 0;
    }
  }
  return 0;
}

/**
 * Check a password against the breach corpus.
 *
 * FAILS OPEN BY DESIGN. If HIBP is slow or down, this returns
 * `{ pwned: false, checkFailed: true }` and the caller lets the signup
 * proceed. Blocking every new account at the academy because a third-party
 * API is having a bad afternoon would be a worse outcome than briefly
 * accepting a weak password — and the password minimum length still applies
 * either way.
 */
export async function isPasswordPwned(
  password: string,
  fetchImpl: typeof fetch = fetch
): Promise<PwnedCheck> {
  const { prefix, suffix } = hashPassword(password);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetchImpl(`${HIBP_RANGE_URL}/${prefix}`, {
        headers: { "Add-Padding": "true" },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) return { pwned: false, count: 0, checkFailed: true };

    const count = findSuffix(await res.text(), suffix);
    return { pwned: count > 0, count, checkFailed: false };
  } catch {
    return { pwned: false, count: 0, checkFailed: true };
  }
}
