"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addLinkMaterial(
  classId: string,
  title: string,
  url: string
) {
  if (!title.trim()) return { error: "Title is required" };
  if (!/^https?:\/\//i.test(url)) return { error: "Link must start with http(s)://" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("materials").insert({
    class_id: classId,
    uploaded_by: user.id,
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("materials").insert({
    class_id: classId,
    uploaded_by: user.id,
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
  const supabase = await createClient();

  // Remove the underlying file too (if any) before deleting the row.
  const { data: mat } = await supabase
    .from("materials")
    .select("storage_path")
    .eq("id", materialId)
    .single();
  if (mat?.storage_path) {
    await supabase.storage.from("class-materials").remove([mat.storage_path]);
  }

  const { error } = await supabase.from("materials").delete().eq("id", materialId);
  if (error) return { error: error.message };
  revalidatePath("/teacher/classes");
  revalidatePath("/student/classes");
  return { success: true };
}
