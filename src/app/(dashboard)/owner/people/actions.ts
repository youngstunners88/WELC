"use server";

import { revalidatePath } from "next/cache";
import { requireRoleAction } from "@/lib/auth/guard";

const VALID_ROLES = ["owner", "teacher", "student"] as const;

export async function setUserRole(
  targetUserId: string,
  newRole: "owner" | "teacher" | "student"
) {
  // App-layer owner check (the RPC re-checks, but fail fast and clearly here).
  const auth = await requireRoleAction(["owner"]);
  if (!auth.ok) return { error: auth.error };
  if (!VALID_ROLES.includes(newRole)) return { error: "Invalid role" };

  const { error: rpcError } = await auth.supabase.rpc("set_user_role", {
    target_user_id: targetUserId,
    new_role: newRole,
  });
  if (rpcError) return { error: rpcError.message };
  revalidatePath("/owner/people");
  return { success: true };
}

export async function rejectTeacher(targetUserId: string) {
  const auth = await requireRoleAction(["owner"]);
  if (!auth.ok) return { error: auth.error };

  const { error: rpcError } = await auth.supabase.rpc("reject_teacher_request", {
    target_user_id: targetUserId,
  });
  if (rpcError) return { error: rpcError.message };
  revalidatePath("/owner/people");
  return { success: true };
}
