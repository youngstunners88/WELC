"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function commitToSession(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("commitments").insert({
    student_id: user.id,
    session_id: sessionId,
    status: "committed",
  });
  // The DB trigger enforces the 1-hour cutoff; surface its message if it fires.
  if (error) return { error: error.message };
  revalidatePath("/student/classes");
  return { success: true };
}

export async function uncommitFromSession(commitmentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("commitments")
    .update({ status: "uncommitted" })
    .eq("id", commitmentId);
  // The DB trigger enforces the 2-hour uncommit cutoff.
  if (error) return { error: error.message };
  revalidatePath("/student/classes");
  return { success: true };
}
