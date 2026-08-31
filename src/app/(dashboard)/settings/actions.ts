"use server";

import { revalidatePath } from "next/cache";
import { requireRoleAction } from "@/lib/auth/guard";

export async function updateProfile(fullName: string, phone: string) {
  const name = fullName.trim();
  if (!name) return { error: "Name is required" };
  if (name.length > 80) return { error: "Name is too long" };

  const trimmedPhone = phone.trim();
  // Permissive but sane: digits, spaces, and + ( ) - only, up to 20 chars.
  if (trimmedPhone && !/^[0-9+()\-\s]{4,20}$/.test(trimmedPhone)) {
    return { error: "Please enter a valid phone number" };
  }

  const auth = await requireRoleAction();
  if (!auth.ok) return { error: auth.error };

  // Column-level grants restrict authenticated users to full_name / phone only,
  // so this can never touch role or status.
  const { error } = await auth.supabase
    .from("profiles")
    .update({ full_name: name, phone: trimmedPhone || null })
    .eq("id", auth.userId);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { success: true };
}

/** GDPR/PIPA: return everything we hold about the caller as a JSON string the
 *  browser can download. Data is gathered server-side by a security-definer RPC
 *  scoped to auth.uid(), so it can only ever return the caller's own data. */
export async function exportMyData() {
  const auth = await requireRoleAction();
  if (!auth.ok) return { error: auth.error };
  const { data, error } = await auth.supabase.rpc("rpc_export_my_data");
  if (error) return { error: error.message };
  return { success: true, json: JSON.stringify(data, null, 2) };
}

/** GDPR/PIPA: delete the caller's own account and personal data, then clear the
 *  session. The RPC refuses to delete an owner account. */
export async function deleteMyAccount() {
  const auth = await requireRoleAction();
  if (!auth.ok) return { error: auth.error };
  const { error } = await auth.supabase.rpc("rpc_delete_my_account");
  if (error) return { error: error.message };
  await auth.supabase.auth.signOut();
  return { success: true };
}
