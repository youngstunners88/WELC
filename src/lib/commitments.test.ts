import { describe, it, expect } from "vitest";
import {
  canCommit,
  canUncommit,
  commitDisabledReason,
  uncommitDisabledReason,
} from "./commitments";
import { COMMIT_CUTOFF_HOURS, UNCOMMIT_CUTOFF_HOURS } from "./constants";

const HOUR = 60 * 60 * 1000;
const now = new Date("2026-09-02T04:00:00Z"); // 13:00 KST
const inHours = (h: number) => new Date(now.getTime() + h * HOUR);

describe("canCommit", () => {
  it("allows committing well before the cutoff", () => {
    expect(canCommit(inHours(24), now)).toBe(true);
  });

  it("allows committing at exactly the cutoff — the boundary is inclusive", () => {
    expect(canCommit(inHours(COMMIT_CUTOFF_HOURS), now)).toBe(true);
  });

  it("refuses one millisecond inside the cutoff", () => {
    const scheduled = new Date(now.getTime() + COMMIT_CUTOFF_HOURS * HOUR - 1);
    expect(canCommit(scheduled, now)).toBe(false);
  });

  it("refuses a session that already started", () => {
    expect(canCommit(inHours(-1), now)).toBe(false);
  });
});

describe("canUncommit", () => {
  it("has a stricter window than committing — a student cannot back out inside 2h", () => {
    expect(UNCOMMIT_CUTOFF_HOURS).toBeGreaterThan(COMMIT_CUTOFF_HOURS);
    const scheduled = inHours(1.5);
    expect(canCommit(scheduled, now)).toBe(true);
    expect(canUncommit(scheduled, now)).toBe(false);
  });

  it("allows uncommitting at exactly the cutoff and beyond", () => {
    expect(canUncommit(inHours(UNCOMMIT_CUTOFF_HOURS), now)).toBe(true);
    expect(canUncommit(inHours(48), now)).toBe(true);
  });

  it("refuses just inside the cutoff and after the session started", () => {
    const scheduled = new Date(now.getTime() + UNCOMMIT_CUTOFF_HOURS * HOUR - 1);
    expect(canUncommit(scheduled, now)).toBe(false);
    expect(canUncommit(inHours(-0.5), now)).toBe(false);
  });
});

describe("disabled reasons", () => {
  it("returns null while the action is still allowed", () => {
    expect(commitDisabledReason(inHours(24), now)).toBeNull();
    expect(uncommitDisabledReason(inHours(24), now)).toBeNull();
  });

  it("explains the closed window using the configured cutoffs, so the copy cannot drift from the rule", () => {
    expect(commitDisabledReason(inHours(0.5), now)).toBe(
      `Commitment closed (${COMMIT_CUTOFF_HOURS}h before start)`
    );
    expect(uncommitDisabledReason(inHours(0.5), now)).toBe(
      `Cannot uncommit (${UNCOMMIT_CUTOFF_HOURS}h before start)`
    );
  });

  it("agrees with the predicates for every case", () => {
    for (const h of [-5, -0.1, 0, 0.5, 1, 1.5, 2, 10]) {
      const scheduled = inHours(h);
      expect(commitDisabledReason(scheduled, now) === null).toBe(
        canCommit(scheduled, now)
      );
      expect(uncommitDisabledReason(scheduled, now) === null).toBe(
        canUncommit(scheduled, now)
      );
    }
  });
});
