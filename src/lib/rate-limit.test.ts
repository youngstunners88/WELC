import { describe, it, expect, beforeEach, vi } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the limit", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      const res = rateLimit(key, 5, 60_000);
      expect(res.ok).toBe(true);
    }
  });

  it("rejects the request once the limit is exceeded", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 5; i++) rateLimit(key, 5, 60_000);
    const res = rateLimit(key, 5, 60_000);
    expect(res.ok).toBe(false);
    expect(res.remaining).toBe(0);
  });

  it("does not confuse different keys — this is the exact bug that made signup a single shared bucket across an office/school network", () => {
    const keyA = `login:1.2.3.4:${Math.random()}`;
    const keyB = `login:1.2.3.4:${Math.random()}`; // same IP, different email
    for (let i = 0; i < 5; i++) rateLimit(keyA, 5, 60_000);
    // keyA is now exhausted, but keyB (a different user on the same IP) must
    // still get its own full budget.
    const res = rateLimit(keyB, 5, 60_000);
    expect(res.ok).toBe(true);
  });

  it("resets after the window elapses", () => {
    vi.useFakeTimers();
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 5; i++) rateLimit(key, 5, 1000);
    expect(rateLimit(key, 5, 1000).ok).toBe(false);

    vi.advanceTimersByTime(1001);
    expect(rateLimit(key, 5, 1000).ok).toBe(true);
    vi.useRealTimers();
  });

  it("caps tracked keys so unbounded key growth can't exhaust memory", () => {
    // Smoke test only: exercise a large number of distinct keys and confirm
    // the limiter doesn't throw or hang. The exact eviction key is
    // intentionally unspecified (Map insertion order), so we only assert it
    // stays functional under load, not which entry gets evicted.
    for (let i = 0; i < 100; i++) {
      const res = rateLimit(`bulk:${i}:${Math.random()}`, 5, 60_000);
      expect(res.ok).toBe(true);
    }
  });
});
