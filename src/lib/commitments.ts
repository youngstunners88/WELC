import { COMMIT_CUTOFF_HOURS, UNCOMMIT_CUTOFF_HOURS } from "./constants";

const HOUR_MS = 60 * 60 * 1000;

/** Can a student still commit? Must be earlier than 1h before the session. */
export function canCommit(scheduledAt: Date, now: Date = new Date()): boolean {
  return scheduledAt.getTime() - now.getTime() >= COMMIT_CUTOFF_HOURS * HOUR_MS;
}

/** Can a student still uncommit? Must be earlier than 2h before the session. */
export function canUncommit(scheduledAt: Date, now: Date = new Date()): boolean {
  return scheduledAt.getTime() - now.getTime() >= UNCOMMIT_CUTOFF_HOURS * HOUR_MS;
}

/** Human-readable reason a commit/uncommit action is disabled, or null if allowed. */
export function commitDisabledReason(
  scheduledAt: Date,
  now: Date = new Date()
): string | null {
  if (!canCommit(scheduledAt, now)) {
    return `Commitment closed (${COMMIT_CUTOFF_HOURS}h before start)`;
  }
  return null;
}

export function uncommitDisabledReason(
  scheduledAt: Date,
  now: Date = new Date()
): string | null {
  if (!canUncommit(scheduledAt, now)) {
    return `Cannot uncommit (${UNCOMMIT_CUTOFF_HOURS}h before start)`;
  }
  return null;
}
