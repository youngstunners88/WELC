/**
 * In-memory sliding-window-ish rate limiter (fixed window, per key). Good
 * enough for MVP scale on a single warm serverless/edge instance — no Redis
 * dependency. State resets on cold start, which only ever makes limits more
 * permissive, never less safe.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Hard cap on tracked keys so an attacker spraying random IPs/keys can't grow
// this map without bound.
const MAX_TRACKED_KEYS = 20_000;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED_KEYS) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey !== undefined) buckets.delete(oldestKey);
    }
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}
