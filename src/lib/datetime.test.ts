import { describe, it, expect, afterEach, vi } from "vitest";
import {
  formatDateTime,
  formatDate,
  formatTime,
  startOfSeoulDay,
  seoulDayRange,
} from "./datetime";

// Every assertion below is written against Asia/Seoul (UTC+9, no DST since
// 1988). The process running these tests is on UTC in CI and on Vercel, which
// is exactly the condition under which timezone bugs here go unnoticed
// locally and corrupt attendance/payroll in production.

describe("formatDate / formatDateTime / formatTime", () => {
  it("rolls to the next Seoul day at 15:00 UTC — a 23:00 KST session belongs to that day, not the UTC one", () => {
    // 2026-09-01T15:00Z is 2026-09-02T00:00 in Seoul.
    expect(formatDate("2026-09-01T15:00:00Z")).toBe("Sep 2, 2026");
    expect(formatTime("2026-09-01T15:00:00Z")).toBe("00:00");
    expect(formatDateTime("2026-09-01T15:00:00Z")).toContain("Sep 2, 2026");
  });

  it("keeps a late-evening Seoul session on the correct (earlier) Seoul date", () => {
    // 2026-09-01T14:59Z is 2026-09-01 23:59 KST — still the 1st in Seoul.
    expect(formatDate("2026-09-01T14:59:00Z")).toBe("Sep 1, 2026");
    expect(formatTime("2026-09-01T14:59:00Z")).toBe("23:59");
  });

  it("formats a mid-morning Seoul class as a 24-hour time, not 12-hour", () => {
    // 00:30 UTC = 09:30 KST.
    expect(formatTime("2026-06-15T00:30:00Z")).toBe("09:30");
    expect(formatDateTime("2026-06-15T00:30:00Z")).toBe("Jun 15, 2026, 09:30");
  });

  it("renders midnight as 00:00, never 24:00 — a 24:00 stamp reads as the wrong day", () => {
    expect(formatTime("2026-09-01T15:00:00Z")).toBe("00:00");
    expect(formatDateTime("2026-09-01T15:00:00Z")).toBe("Sep 2, 2026, 00:00");
  });

  it("accepts a Date as well as an ISO string and agrees with itself", () => {
    const iso = "2026-01-31T16:20:00Z";
    expect(formatDate(new Date(iso))).toBe(formatDate(iso));
    expect(formatTime(new Date(iso))).toBe(formatTime(iso));
    // 16:20Z on Jan 31 is 01:20 on Feb 1 in Seoul — month and year roll too.
    expect(formatDate(iso)).toBe("Feb 1, 2026");
  });

  it("crosses the year boundary in Seoul, not in UTC", () => {
    // 2025-12-31T15:00Z is New Year's Day in Seoul.
    expect(formatDate("2025-12-31T15:00:00Z")).toBe("Jan 1, 2026");
    expect(formatDate("2025-12-31T14:59:00Z")).toBe("Dec 31, 2025");
  });
});

describe("startOfSeoulDay", () => {
  it("returns 15:00 UTC of the previous day — Seoul midnight", () => {
    expect(startOfSeoulDay(new Date("2026-09-02T04:24:00Z")).toISOString()).toBe(
      "2026-09-01T15:00:00.000Z"
    );
  });

  it("is idempotent: the start of the day containing a day-start is itself", () => {
    const start = startOfSeoulDay(new Date("2026-09-02T04:24:00Z"));
    expect(startOfSeoulDay(start).toISOString()).toBe(start.toISOString());
  });

  it("puts an instant one millisecond before Seoul midnight in the previous day", () => {
    const justBefore = new Date("2026-09-01T14:59:59.999Z");
    expect(startOfSeoulDay(justBefore).toISOString()).toBe(
      "2026-08-31T15:00:00.000Z"
    );
  });
});

describe("seoulDayRange", () => {
  it("covers Seoul midnight to Seoul midnight — the bug: a UTC server reported 09:00→09:00 and silently dropped every morning class", () => {
    const { startIso, endIso } = seoulDayRange(new Date("2026-09-02T04:24:00Z"));
    expect(startIso).toBe("2026-09-01T15:00:00.000Z");
    expect(endIso).toBe("2026-09-02T15:00:00.000Z");
  });

  it("includes an 08:00 KST class in today's window", () => {
    const now = new Date("2026-09-02T04:24:00Z"); // 13:24 KST
    const { startIso, endIso } = seoulDayRange(now);
    const morningClass = new Date("2026-09-01T23:00:00Z"); // 08:00 KST on Sep 2
    expect(morningClass >= new Date(startIso)).toBe(true);
    expect(morningClass < new Date(endIso)).toBe(true);
  });

  it("excludes tomorrow's early-morning class from today's window", () => {
    const now = new Date("2026-09-02T04:24:00Z");
    const { endIso } = seoulDayRange(now);
    const tomorrowMorning = new Date("2026-09-02T23:00:00Z"); // 08:00 KST Sep 3
    expect(tomorrowMorning < new Date(endIso)).toBe(false);
  });

  it("is a half-open window exactly 24 hours wide", () => {
    const { startIso, endIso } = seoulDayRange(new Date("2026-03-08T12:00:00Z"));
    const span = new Date(endIso).getTime() - new Date(startIso).getTime();
    expect(span).toBe(24 * 60 * 60 * 1000);
  });

  it("still reports the Seoul day just after Seoul midnight, when UTC is still on the previous date", () => {
    // 2026-09-01T15:00:30Z — 00:00:30 on Sep 2 in Seoul, 15:00 on Sep 1 in UTC.
    const { startIso, endIso } = seoulDayRange(new Date("2026-09-01T15:00:30Z"));
    expect(startIso).toBe("2026-09-01T15:00:00.000Z");
    expect(endIso).toBe("2026-09-02T15:00:00.000Z");
  });

  it("defaults to now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-02T04:24:00Z"));
    try {
      expect(seoulDayRange()).toEqual({
        startIso: "2026-09-01T15:00:00.000Z",
        endIso: "2026-09-02T15:00:00.000Z",
      });
    } finally {
      vi.useRealTimers();
    }
  });
});

afterEach(() => {
  vi.useRealTimers();
});
