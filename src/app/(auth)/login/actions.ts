"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(email: string, password: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  if (profile?.role === "owner") redirect("/owner");
  if (profile?.role === "teacher") redirect("/teacher");
  redirect("/student/classes");
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  requestedRole: "teacher" | "student" = "student"
) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, requested_role: requestedRole },
    },
  });
  if (error) return { error: error.message };
  // Effective role is always 'student' on signup (DB trigger). A teacher
  // request is parked as pending until an owner approves it; the new account
  // can use the app as a student in the meantime.
  return { success: true, pending: requestedRole === "teacher" };
}
