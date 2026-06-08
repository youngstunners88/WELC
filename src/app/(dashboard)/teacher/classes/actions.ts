"use server";

import { revalidatePath } from "next/cache";
import { requireRoleAction } from "@/lib/auth/guard";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Confirms the caller may manage materials for `classId`: owners always may;
 * teachers only for classes they teach. Returns null when allowed, else an
 * error string. Defense-in-depth on top of the materials RLS policies.
 */
async function canManageClass(
  supabase: SupabaseClient,
  role: string,
  userId: string,
  classId: string
): Promise<string | null> {
  if (role === "owner") return null;
  const { data } = await supabase
    .from("classes")
    .select("teacher_id")
    .eq("id", classId)
    .single<{ teacher_id: string }>();
  if (!data) return "Class not found";
  if (data.teacher_id !== userId) return "Not authorized for this class";
  return null;
}

export async function addLinkMaterial(
  classId: string,
  title: string,
  url: string
) {
  if (!title.trim()) return { error: "Title is required" };
  if (!/^https?:\/\//i.test(url))
    return { error: "Link must start with http(s)://" };

  const auth = await requireRoleAction(["owner", "teacher"]);
  if (!auth.ok) return { error: auth.error };
  const denied = await canManageClass(
    auth.supabase,
    auth.role,
    auth.userId,
    classId
  );
  if (denied) return { error: denied };

  const { error } = await auth.supabase.from("materials").insert({
    class_id: classId,
    uploaded_by: auth.userId,
    title: title.trim(),
    kind: "link",
    url,
  });
  if (error) return { error: error.message };
  revalidatePath("/teacher/classes");
  revalidatePath("/student/classes");
  return { success: true };
}

export async function addFileMaterial(
  classId: string,
  title: string,
  storagePath: string
) {
  if (!title.trim()) return { error: "Title is required" };

  const auth = await requireRoleAction(["owner", "teacher"]);
  if (!auth.ok) return { error: auth.error };
  const denied = await canManageClass(
    auth.supabase,
    auth.role,
    auth.userId,
    classId
  );
  if (denied) return { error: denied };

  const { error } = await auth.supabase.from("materials").insert({
    class_id: classId,
    uploaded_by: auth.userId,
    title: title.trim(),
    kind: "file",
    storage_path: storagePath,
  });
  if (error) return { error: error.message };
  revalidatePath("/teacher/classes");
  revalidatePath("/student/classes");
  return { success: true };
}

export async function deleteMaterial(materialId: string) {
  const auth = await requireRoleAction(["owner", "teacher"]);
  if (!auth.ok) return { error: auth.error };
  const { supabase } = auth;

  // Load the row first so we can verify class ownership and clean up storage.
  const { data: mat } = await supabase
    .from("materials")
    .select("class_id, storage_path")
    .eq("id", materialId)
    .single<{ class_id: string; storage_path: string | null }>();
  if (!mat) return { error: "Material not found" };

  const denied = await canManageClass(
    supabase,
    auth.role,
    auth.userId,
    mat.class_id
  );
  if (denied) return { error: denied };

  if (mat.storage_path) {
    await supabase.storage.from("class-materials").remove([mat.storage_path]);
  }

  const { error } = await supabase
    .from("materials")
    .delete()
    .eq("id", materialId);
  if (error) return { error: error.message };
  revalidatePath("/teacher/classes");
  revalidatePath("/student/classes");
  return { success: true };
}
