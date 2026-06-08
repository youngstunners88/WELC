"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function ownerClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase: null, error: "Not authenticated" } as const;
  return { supabase, error: null } as const;
}

export async function setUserRole(
  targetUserId: string,
  newRole: "owner" | "teacher" | "student"
) {
  const { supabase, error } = await ownerClient();
  if (error) return { error };
  const { error: rpcError } = await supabase.rpc("set_user_role", {
    target_user_id: targetUserId,
    new_role: newRole,
  });
  if (rpcError) return { error: rpcError.message };
  revalidatePath("/owner/people");
  return { success: true };
}

export async function rejectTeacher(targetUserId: string) {
  const { supabase, error } = await ownerClient();
  if (error) return { error };
  const { error: rpcError } = await supabase.rpc("reject_teacher_request", {
    target_user_id: targetUserId,
  });
  if (rpcError) return { error: rpcError.message };
  revalidatePath("/owner/people");
  return { success: true };
}
