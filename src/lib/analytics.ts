import { AT_RISK_MISSED_THRESHOLD } from "./constants";

/** A student is "at risk" once they hit the missed-session threshold. */
export function isAtRisk(missedCount: number): boolean {
  return missedCount >= AT_RISK_MISSED_THRESHOLD;
}
