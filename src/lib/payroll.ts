/**
 * Teacher-hours aggregation.
 *
 * `v_teacher_hours_monthly` returns one row per teacher per month; this rolls
 * those rows up into the per-teacher totals the owner is shown (dashboard and
 * AI assistant). These are the numbers teachers are paid from, so the logic
 * lives here — pure and unit-tested — rather than inside a tool executor.
 */

export interface TeacherHoursRow {
  teacher_name: string;
  month: string;
  hours: number;
  sessions: number;
}

export interface TeacherHoursTotal {
  teacher_name: string;
  hours: number;
  sessions: number;
}

/**
 * @param month Optional `YYYY-MM` filter. Rows carry either `YYYY-MM` or a
 *   full `YYYY-MM-DD` month start, so the comparison is on the first 7 chars.
 */
export function aggregateTeacherHours(
  rows: TeacherHoursRow[],
  month?: string | null
): TeacherHoursTotal[] {
  const filtered = month
    ? rows.filter((r) => String(r.month).slice(0, 7) === month)
    : rows;

  const byTeacher = new Map<string, { hours: number; sessions: number }>();
  for (const r of filtered) {
    const cur = byTeacher.get(r.teacher_name) ?? { hours: 0, sessions: 0 };
    cur.hours += Number(r.hours) || 0;
    cur.sessions += Number(r.sessions) || 0;
    byTeacher.set(r.teacher_name, cur);
  }

  return Array.from(byTeacher, ([teacher_name, v]) => ({
    teacher_name,
    // One decimal place: 1.5h is meaningful, 1.4999999999h is float noise.
    hours: Math.round(v.hours * 10) / 10,
    sessions: v.sessions,
  }));
}
