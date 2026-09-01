"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function signIn(email: string, password: string) {
  // Brute-force guard: 20 attempts / 15 min, keyed by IP + the email being
  // attempted, so one bad actor can't lock out other users at the same IP
  // and a distributed attempt against one account still gets throttled. 20 is
  // generous enough that normal users (or a shared-NAT office/school network)
  // never trip it by mistake, while still stopping a real password-guessing run.
  const ip = await clientIp();
  const { ok } = rateLimit(`login:${ip}:${email.toLowerCase()}`, 20, 15 * 60_000);
  if (!ok) {
    return { error: "Too many login attempts. Please try again in a few minutes." };
  }

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
  // Same brute-force/spam guard as signIn, scoped to account-creation abuse.
  // Keyed by IP only (not email, since every signup email is new), so a
  // shared-NAT network (office/school wifi) sharing one public IP needs a
  // generous budget — 20 signups / 15 min — to avoid locking out unrelated
  // people testing or enrolling from the same network.
  const ip = await clientIp();
  const { ok } = rateLimit(`signup:${ip}`, 20, 15 * 60_000);
  if (!ok) {
    return { error: "Too many signup attempts. Please try again in a few minutes." };
  }

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
