import { addWeeks } from "date-fns";
import { SESSIONS_PER_CLASS } from "./constants";

export interface NewSession {
  class_id: string;
  session_number: number;
  scheduled_at: string;
  status: "scheduled";
}

/**
 * Generate the 4 weekly sessions for a class, starting from startDate.
 * Each subsequent session is one week later.
 */
export function generateWeeklySessions(
  classId: string,
  startDate: Date,
  _durationMinutes: number
): NewSession[] {
  return Array.from({ length: SESSIONS_PER_CLASS }, (_, i) => ({
    class_id: classId,
    session_number: i + 1,
    scheduled_at: addWeeks(startDate, i).toISOString(),
    status: "scheduled" as const,
  }));
}
