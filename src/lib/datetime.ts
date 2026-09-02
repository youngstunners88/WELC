import { TIMEZONE } from "./constants";

/** Format an ISO timestamp in the academy's timezone (Asia/Seoul). */
export function formatDateTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleTimeString("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How far the given zone is ahead of UTC at `date`, in milliseconds.
 * Derived from Intl rather than hard-coded so the academy timezone stays a
 * single constant (`TIMEZONE`) and a DST-observing zone would still work.
 */
function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  // Wall-clock-as-UTC minus the real instant, rounded to whole seconds to
  // discard the sub-second remainder Intl does not report.
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** The instant at which the academy's (Asia/Seoul) calendar day containing
 * `now` begins. */
export function startOfSeoulDay(now: Date = new Date()): Date {
  const offset = zoneOffsetMs(now, TIMEZONE);
  const shifted = new Date(now.getTime() + offset);
  const dayStart = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate()
  );
  return new Date(dayStart - offset);
}

/**
 * Half-open [start, end) UTC range covering "today" in Asia/Seoul.
 *
 * Used by anything that answers "what's on today?" — the academy's day, not
 * the server's. The previous implementation parsed a Seoul-formatted string
 * back with `new Date(...)`, which re-reads those wall-clock digits in the
 * *server's* zone; on Vercel (UTC) that shifted the window nine hours, so
 * morning classes fell out of "today" and tomorrow's early sessions fell in.
 */
export function seoulDayRange(now: Date = new Date()): {
  startIso: string;
  endIso: string;
} {
  const start = startOfSeoulDay(now);
  return {
    startIso: start.toISOString(),
    endIso: new Date(start.getTime() + DAY_MS).toISOString(),
  };
}
