import { describe, it, expect } from "vitest";
import {
  aggregateTeacherHours,
  type TeacherHoursRow,
  type TeacherHoursTotal,
} from "./payroll";

const rows: TeacherHoursRow[] = [
  { teacher_name: "김선생", month: "2026-06-01", hours: 12.5, sessions: 10 },
  { teacher_name: "김선생", month: "2026-07-01", hours: 8, sessions: 7 },
  { teacher_name: "Sarah", month: "2026-06-01", hours: 4.25, sessions: 3 },
  { teacher_name: "Sarah", month: "2026-06-01", hours: 1.25, sessions: 1 },
];

function byName(result: TeacherHoursTotal[], name: string) {
  return result.find((r) => r.teacher_name === name);
}

describe("aggregateTeacherHours", () => {
  it("sums every month per teacher when no month is given", () => {
    const result = aggregateTeacherHours(rows);
    expect(result).toHaveLength(2);
    expect(byName(result, "김선생")).toEqual({
      teacher_name: "김선생",
      hours: 20.5,
      sessions: 17,
    });
    expect(byName(result, "Sarah")).toEqual({
      teacher_name: "Sarah",
      hours: 5.5,
      sessions: 4,
    });
  });

  it("filters on YYYY-MM even though the view returns a full YYYY-MM-DD month start", () => {
    const june = aggregateTeacherHours(rows, "2026-06");
    expect(byName(june, "김선생")).toEqual({
      teacher_name: "김선생",
      hours: 12.5,
      sessions: 10,
    });
    expect(byName(june, "Sarah")?.hours).toBe(5.5);
  });

  it("never bleeds one month's hours into another — the whole point of a payroll month", () => {
    const july = aggregateTeacherHours(rows, "2026-07");
    expect(july).toEqual([
      { teacher_name: "김선생", hours: 8, sessions: 7 },
    ]);
  });

  it("returns nothing for a month with no teaching, rather than falling back to all-time", () => {
    expect(aggregateTeacherHours(rows, "2026-01")).toEqual([]);
    expect(aggregateTeacherHours([], "2026-06")).toEqual([]);
    expect(aggregateTeacherHours([])).toEqual([]);
  });

  it("treats an empty-string month as 'no filter', matching the tool's null default", () => {
    expect(aggregateTeacherHours(rows, "")).toHaveLength(2);
    expect(aggregateTeacherHours(rows, null)).toHaveLength(2);
  });

  it("rounds to one decimal so float addition cannot surface 12.299999999999999 hours", () => {
    const noisy: TeacherHoursRow[] = [
      { teacher_name: "A", month: "2026-06", hours: 0.1, sessions: 1 },
      { teacher_name: "A", month: "2026-06", hours: 0.2, sessions: 1 },
    ];
    expect(aggregateTeacherHours(noisy)[0].hours).toBe(0.3);
  });

  it("adds numeric strings, which is how Postgres numeric columns arrive over the wire", () => {
    const stringy = [
      { teacher_name: "A", month: "2026-06", hours: "1.5", sessions: "2" },
      { teacher_name: "A", month: "2026-06", hours: "2.5", sessions: "3" },
    ] as unknown as TeacherHoursRow[];
    expect(aggregateTeacherHours(stringy)).toEqual([
      { teacher_name: "A", hours: 4, sessions: 5 },
    ]);
  });

  it("treats a null or unparsable value as zero instead of poisoning the total with NaN", () => {
    const broken = [
      { teacher_name: "A", month: "2026-06", hours: 3, sessions: 2 },
      { teacher_name: "A", month: "2026-06", hours: null, sessions: undefined },
    ] as unknown as TeacherHoursRow[];
    expect(aggregateTeacherHours(broken)).toEqual([
      { teacher_name: "A", hours: 3, sessions: 2 },
    ]);
  });

  it("keeps two teachers with different names apart and does not merge on a shared first name", () => {
    const sameFirstName: TeacherHoursRow[] = [
      { teacher_name: "김민수", month: "2026-06", hours: 5, sessions: 4 },
      { teacher_name: "김민수 B", month: "2026-06", hours: 6, sessions: 5 },
    ];
    expect(aggregateTeacherHours(sameFirstName)).toHaveLength(2);
  });
});
