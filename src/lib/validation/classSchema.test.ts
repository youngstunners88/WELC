import { describe, it, expect } from "vitest";
import { classSchema } from "./classSchema";

const valid = {
  name: "Cabin Crew English",
  level: "beginner" as const,
  teacher_id: "11111111-2222-4333-8444-555555555555",
  start_date: "2026-09-15",
  duration_minutes: "60", // forms submit strings
  meeting_platform: "zoom" as const,
  meeting_link: "https://zoom.us/j/1234567890",
  description: "  Level 1 group class  ",
};

function parse(overrides: Record<string, unknown> = {}) {
  return classSchema.safeParse({ ...valid, ...overrides });
}

describe("classSchema", () => {
  it("accepts a well-formed class and coerces the duration a form submits as a string", () => {
    const r = parse();
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.duration_minutes).toBe(60);
      expect(r.data.name).toBe("Cabin Crew English");
      expect(r.data.description).toBe("Level 1 group class");
    }
  });

  it("rejects a meeting link that is not http(s) — the same class of link safeUrl blocks at render time", () => {
    for (const link of [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "ftp://files.example.com/room",
      "zoom.us/j/123",
    ]) {
      const r = parse({ meeting_link: link });
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(r.error.issues[0].message).toMatch(/http:\/\/ or https:\/\//);
      }
    }
  });

  it("turns an empty meeting link into null rather than storing an empty string", () => {
    const r = parse({ meeting_link: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.meeting_link).toBeNull();
  });

  it("allows an omitted or null meeting link — in-person classes have none", () => {
    const omitted = classSchema.safeParse({
      name: valid.name,
      level: valid.level,
      teacher_id: valid.teacher_id,
      start_date: valid.start_date,
      duration_minutes: 90,
    });
    expect(omitted.success).toBe(true);
    expect(parse({ meeting_link: null, meeting_platform: null }).success).toBe(
      true
    );
  });

  it("trims a padded meeting link so the stored href has no surrounding whitespace", () => {
    const r = parse({ meeting_link: "  https://zoom.us/j/1  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.meeting_link).toBe("https://zoom.us/j/1");
  });

  it("requires a non-blank class name", () => {
    expect(parse({ name: "" }).success).toBe(false);
    expect(parse({ name: "   " }).success).toBe(false);
  });

  it("requires a teacher to be chosen, as a real uuid", () => {
    expect(parse({ teacher_id: "" }).success).toBe(false);
    expect(parse({ teacher_id: "not-a-uuid" }).success).toBe(false);
  });

  it("holds the duration between 30 and 240 minutes, inclusive — payroll hours are derived from it", () => {
    expect(parse({ duration_minutes: 30 }).success).toBe(true);
    expect(parse({ duration_minutes: 240 }).success).toBe(true);
    expect(parse({ duration_minutes: 29 }).success).toBe(false);
    expect(parse({ duration_minutes: 241 }).success).toBe(false);
    expect(parse({ duration_minutes: 0 }).success).toBe(false);
    expect(parse({ duration_minutes: -60 }).success).toBe(false);
  });

  it("rejects a fractional or non-numeric duration instead of silently rounding it", () => {
    expect(parse({ duration_minutes: 60.5 }).success).toBe(false);
    expect(parse({ duration_minutes: "an hour" }).success).toBe(false);
    expect(parse({ duration_minutes: "" }).success).toBe(false);
  });

  it("rejects unknown levels and platforms rather than passing them to the database enum", () => {
    expect(parse({ level: "expert" }).success).toBe(false);
    expect(parse({ meeting_platform: "skype" }).success).toBe(false);
  });

  it("requires a start date", () => {
    expect(parse({ start_date: "" }).success).toBe(false);
  });
});
