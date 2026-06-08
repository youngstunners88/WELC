"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRoleAction } from "@/lib/auth/guard";
import { ATTENDANCE_MARKS } from "@/lib/constants";
import type { AttendanceMark } from "@/types/database";

export async function startSession(sessionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("rpc_start_session", {
    p_session_id: sessionId,
  });
  if (error) return { error: error.message };
  revalidatePath(`/teacher/attendance/${sessionId}`);
  revalidatePath("/teacher");
  return { success: true };
}

export async function endSession(sessionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("rpc_end_session", {
    p_session_id: sessionId,
  });
  if (error) return { error: error.message };
  revalidatePath(`/teacher/attendance/${sessionId}`);
  revalidatePath("/teacher");
  return { success: true };
}

export async function logSession(sessionId: string, minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 600) {
    return { error: "Duration must be between 1 and 600 minutes" };
  }
  const auth = await requireRoleAction(["owner", "teacher"]);
  if (!auth.ok) return { error: auth.error };

  const { error } = await auth.supabase.rpc("rpc_log_session", {
    p_session_id: sessionId,
    p_minutes: Math.round(minutes),
  });
  if (error) return { error: error.message };
  revalidatePath("/teacher");
  revalidatePath("/owner");
  revalidatePath("/owner/attendance");
  return { success: true };
}

export async function markAttendance(
  sessionId: string,
  studentId: string,
  mark: AttendanceMark
) {
  if (!ATTENDANCE_MARKS.includes(mark)) return { error: "Invalid mark" };

  // Only teachers/owners may mark; RLS further restricts to the session's own
  // teacher, so an owner can only mark sessions for classes they teach.
  const auth = await requireRoleAction(["owner", "teacher"]);
  if (!auth.ok) return { error: auth.error };

  const { error } = await auth.supabase
    .from("attendance")
    .upsert(
      { session_id: sessionId, student_id: studentId, mark },
      { onConflict: "session_id,student_id" }
    );
  if (error) return { error: error.message };
  revalidatePath(`/teacher/attendance/${sessionId}`);
  return { success: true };
}
