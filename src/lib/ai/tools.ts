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
    // Teacher names are resolved via rpc_teacher_names rather than an embedded
    // join on profiles: students have no RLS read access to teacher rows, so
    // the join returned null for them and the assistant reported classes with
    // no teacher. The RPC returns id + full_name only, never contact details.
    const { data, error } = await supabase
      .from("class_sessions")
      .select("scheduled_at, status, classes!inner(name, teacher_id)")
      .gte("scheduled_at", startIso)
      .lt("scheduled_at", endIso)
      .order("scheduled_at");
    if (error) return { ok: false, note: error.message };

    const rows = (data ?? []) as unknown as {
      scheduled_at: string;
      status: string;
      classes: { name: string; teacher_id: string | null } | null;
    }[];
    const teacherIds = Array.from(
      new Set(rows.map((r) => r.classes?.teacher_id).filter(Boolean))
    ) as string[];

    let nameById = new Map<string, string>();
    if (teacherIds.length) {
      const { data: names } = await supabase.rpc("rpc_teacher_names", {
        p_ids: teacherIds,
      });
      nameById = new Map(
        ((names as { id: string; full_name: string }[] | null) ?? []).map(
          (t) => [t.id, t.full_name]
        )
      );
    }

    return {
      ok: true,
      data: rows.map((r) => ({
        scheduled_at: r.scheduled_at,
        status: r.status,
        class_name: r.classes?.name ?? null,
        teacher_name: r.classes?.teacher_id
          ? nameById.get(r.classes.teacher_id) ?? null
          : null,
      })),
    };
  },

  // Write action (owner/teacher only — enforced inside the RPC). Sends an in-app
  // reminder now; AlimTalk fan-out is handled by the dashboard send path.
  async send_reminder(supabase, args) {
    const audience = ["session", "tomorrow", "all_students"].includes(
      String(args.audience)
    )
      ? String(args.audience)
      : "tomorrow";
    const message =
      typeof args.message === "string" ? args.message.trim() : "";
    if (!message) return { ok: false, note: "A message is required." };
    const session_id =
      typeof args.session_id === "string" ? args.session_id : null;
    const { data, error } = await supabase.rpc("rpc_send_reminder", {
      p_audience: audience,
      p_session_id: session_id,
      p_message: message,
    });
    if (error) return { ok: false, note: error.message };
    return {
      ok: true,
      data: { audience, sent_to: ((data as unknown[]) ?? []).length },
    };
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
  {
    type: "function",
    function: {
      name: "send_reminder",
      description:
        "Send a reminder notification NOW to students (owner/teacher only). Only call this AFTER the user has explicitly confirmed the audience and message. audience: 'tomorrow' = students committed to tomorrow's classes, 'all_students' = every student, 'session' = students committed to a specific session_id.",
      parameters: {
        type: "object",
        properties: {
          audience: {
            type: "string",
            enum: ["tomorrow", "all_students", "session"],
          },
          message: { type: "string", description: "The reminder text to send." },
          session_id: {
            type: "string",
            description: "Required only when audience = 'session'.",
          },
        },
        required: ["audience", "message"],
      },
    },
  },
] as const;
