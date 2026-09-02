import { describe, it, expect } from "vitest";
import { generateWeeklySessions } from "./sessions";
import { SESSIONS_PER_CLASS } from "./constants";
import { formatTime, formatDate } from "./datetime";

// Mid-September start: four weeks out stays clear of every northern-hemisphere
// DST transition, so these assertions hold whatever timezone the test host is
// in (Seoul itself has had no DST since 1988).
const start = new Date("2026-09-15T01:00:00Z"); // 10:00 KST

describe("generateWeeklySessions", () => {
  it("creates exactly SESSIONS_PER_CLASS sessions numbered from 1", () => {
    const sessions = generateWeeklySessions("class-1", start, 60);
    expect(sessions).toHaveLength(SESSIONS_PER_CLASS);
    expect(sessions.map((s) => s.session_number)).toEqual([1, 2, 3, 4]);
  });

  it("puts the first session at the requested start time, not a week later", () => {
    const [first] = generateWeeklySessions("class-1", start, 60);
    expect(first.scheduled_at).toBe(start.toISOString());
  });

  it("spaces the sessions exactly seven days apart", () => {
    const sessions = generateWeeklySessions("class-1", start, 60);
    const week = 7 * 24 * 60 * 60 * 1000;
    for (let i = 1; i < sessions.length; i++) {
      const delta =
        new Date(sessions[i].scheduled_at).getTime() -
        new Date(sessions[i - 1].scheduled_at).getTime();
      expect(delta).toBe(week);
    }
  });

  it("keeps the same Seoul wall-clock time for every session — a drifting hour would misreport teacher payroll hours", () => {
    const sessions = generateWeeklySessions("class-1", start, 60);
    const times = sessions.map((s) => formatTime(s.scheduled_at));
    expect(new Set(times).size).toBe(1);
    expect(times[0]).toBe("10:00");
    expect(sessions.map((s) => formatDate(s.scheduled_at))).toEqual([
      "Sep 15, 2026",
      "Sep 22, 2026",
      "Sep 29, 2026",
      "Oct 6, 2026",
    ]);
  });

  it("stamps every session with the class id and a 'scheduled' status", () => {
    const sessions = generateWeeklySessions("abc-123", start, 90);
    for (const s of sessions) {
      expect(s.class_id).toBe("abc-123");
      expect(s.status).toBe("scheduled");
    }
  });

  it("emits ISO-8601 UTC strings, which is what the database column stores", () => {
    for (const s of generateWeeklySessions("class-1", start, 60)) {
      expect(s.scheduled_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    }
  });
});
