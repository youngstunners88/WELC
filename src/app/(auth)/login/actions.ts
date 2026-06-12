"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

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

  // Record the sign-in for the owner's audit trail (best-effort).
  await logAudit(supabase, "auth.login", "user", user?.id ?? null, {
    role: profile?.role ?? null,
  });

  if (profile?.role === "owner") redirect("/owner");
  if (profile?.role === "teacher") redirect("/teacher");
  redirect("/student/classes");
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    v
  );
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  requestedRole: "teacher" | "student" = "student",
  referredBy?: string
) {
  const supabase = await createClient();
  const data: Record<string, string> = {
    full_name: fullName,
    requested_role: requestedRole,
  };
  // Attribution: only forward a well-formed teacher id. The DB trigger
  // additionally verifies it belongs to a real teacher/owner before storing.
  if (referredBy && isUuid(referredBy)) data.referred_by = referredBy;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data },
  });
  if (error) return { error: error.message };
  // Effective role is always 'student' on signup (DB trigger). A teacher
  // request is parked as pending until an owner approves it; the new account
  // can use the app as a student in the meantime.
  return { success: true, pending: requestedRole === "teacher" };
}
