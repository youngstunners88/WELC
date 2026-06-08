"use server";

import { revalidatePath } from "next/cache";
import { requireRoleAction } from "@/lib/auth/guard";

export async function updateProfile(fullName: string, phone: string) {
  const name = fullName.trim();
  if (!name) return { error: "Name is required" };
  if (name.length > 80) return { error: "Name is too long" };

  const auth = await requireRoleAction();
  if (!auth.ok) return { error: auth.error };

  // Column-level grants restrict authenticated users to full_name / phone only,
  // so this can never touch role or status.
  const { error } = await auth.supabase
    .from("profiles")
    .update({ full_name: name, phone: phone.trim() || null })
    .eq("id", auth.userId);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { success: true };
}
