"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { classSchema } from "@/lib/validation/classSchema";
import { generateWeeklySessions } from "@/lib/sessions";

export async function createClass(formData: unknown) {
  const parsed = classSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: cls, error: classError } = await supabase
    .from("classes")
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single();

  if (classError) return { error: classError.message };

  const sessions = generateWeeklySessions(
    cls.id,
    new Date(parsed.data.start_date),
    parsed.data.duration_minutes
  );
  const { error: sessionError } = await supabase
    .from("class_sessions")
    .insert(sessions);
  if (sessionError) return { error: sessionError.message };

  revalidatePath("/owner/classes");
  revalidatePath("/owner");
  return { success: true };
}
