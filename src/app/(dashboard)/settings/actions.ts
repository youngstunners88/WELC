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

/** Toggle KakaoTalk reminder consent. Isolated so it degrades gracefully if the
 *  20260608 migration hasn't been applied yet. */
export async function updateKakaoConsent(consent: boolean) {
  const auth = await requireRoleAction();
  if (!auth.ok) return { error: auth.error };
  const { error } = await auth.supabase
    .from("profiles")
    .update({ kakao_alimtalk_consent: consent })
    .eq("id", auth.userId);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}
