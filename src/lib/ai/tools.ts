import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Read-only AI tools. Each executes through the *caller's* RLS-scoped Supabase
 * client, so the assistant can never surface data the signed-in user couldn't
 * already see. No write/delete tools are exposed — the assistant is advisory.
 */

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  note?: string;
}

type Executor = (
  supabase: SupabaseClient,
  args: Record<string, unknown>
) => Promise<ToolResult>;

function seoulToday(): { startIso: string; endIso: string } {
  const now = new Date();
  const seoul = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Seoul" })
  );
  seoul.setHours(0, 0, 0, 0);
  const start = new Date(seoul);
  const end = new Date(seoul);
  end.setDate(end.getDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export const toolExecutors: Record<string, Executor> = {
  async get_dashboard_stats(supabase) {
    const { data, error } = await supabase.rpc("owner_dashboard_stats");
    if (error) return { ok: false, note: error.message };
    return { ok: true, data };
  },

  async get_teacher_hours(supabase, args) {
    const month = typeof args.month === "string" ? args.month : null; // YYYY-MM
    const { data, error } = await supabase
      .from("v_teacher_hours_monthly")
      .select("teacher_name, month, hours, sessions");
    if (error) return { ok: false, note: error.message };
    const rows = (data ?? []) as {
      teacher_name: string;
      month: string;
      hours: number;
      sessions: number;
    }[];
    const filtered = month
      ? rows.filter((r) => String(r.month).slice(0, 7) === month)
      : rows;
    const byTeacher = new Map<string, { hours: number; sessions: number }>();
    for (const r of filtered) {
      const cur = byTeacher.get(r.teacher_name) ?? { hours: 0, sessions: 0 };
      cur.hours += Number(r.hours);
      cur.sessions += Number(r.sessions);
      byTeacher.set(r.teacher_name, cur);
    }
    return {
      ok: true,
      data: Array.from(byTeacher, ([teacher_name, v]) => ({
        teacher_name,
        hours: Math.round(v.hours * 10) / 10,
        sessions: v.sessions,
      })),
    };
  },

  async get_at_risk_students(supabase, args) {
    const threshold =
      typeof args.threshold === "number" ? args.threshold : 3;
    const { data, error } = await supabase
      .from("v_student_attendance")
      .select("full_name, missed, attended, total, attendance_rate")
      .gte("missed", threshold)
      .order("missed", { ascending: false });
    if (error) return { ok: false, note: error.message };
    return { ok: true, data };
  },

  async get_student_attendance(supabase, args) {
    const name = typeof args.student_name === "string" ? args.student_name : "";
    let q = supabase
      .from("v_student_attendance")
      .select("full_name, attended, missed, total, attendance_rate");
    if (name) q = q.ilike("full_name", `%${name}%`);
    const { data, error } = await q.limit(25);
    if (error) return { ok: false, note: error.message };
    return { ok: true, data };
  },

  async get_today_classes(supabase) {
    const { startIso, endIso } = seoulToday();
    const { data, error } = await supabase
      .from("class_sessions")
      .select(
        "scheduled_at, status, classes!inner(name, profiles:teacher_id(full_name))"
      )
      .gte("scheduled_at", startIso)
      .lt("scheduled_at", endIso)
      .order("scheduled_at");
    if (error) return { ok: false, note: error.message };
    return { ok: true, data };
  },
};

/** OpenAI/Groq-compatible tool schemas advertised to the model. */
export const toolSchemas = [
  {
    type: "function",
    function: {
      name: "get_dashboard_stats",
      description:
        "Get headline academy stats: active classes, total teacher hours, attendance rate, and at-risk student count. Owner only.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_teacher_hours",
      description:
        "Get teaching hours and session counts per teacher. Optionally filter to a month (format YYYY-MM, e.g. 2026-06).",
      parameters: {
        type: "object",
        properties: {
          month: {
            type: "string",
            description: "Month as YYYY-MM. Omit for all-time.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_at_risk_students",
      description:
        "List students at risk (with many missed classes). threshold = minimum missed count, default 3.",
      parameters: {
        type: "object",
        properties: {
          threshold: { type: "number", description: "Minimum missed classes." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_student_attendance",
      description:
        "Get attendance rate and counts for a student by (partial) name, or all students if no name is given.",
      parameters: {
        type: "object",
        properties: {
          student_name: { type: "string", description: "Full or partial name." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_today_classes",
      description: "Get all classes/sessions scheduled for today (Asia/Seoul).",
      parameters: { type: "object", properties: {} },
    },
  },
] as const;
