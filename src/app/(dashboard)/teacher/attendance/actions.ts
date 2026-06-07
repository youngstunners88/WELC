"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

export async function markAttendance(
  sessionId: string,
  studentId: string,
  mark: AttendanceMark
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("attendance")
    .upsert(
      { session_id: sessionId, student_id: studentId, mark },
      { onConflict: "session_id,student_id" }
    );
  if (error) return { error: error.message };
  revalidatePath(`/teacher/attendance/${sessionId}`);
  return { success: true };
}
