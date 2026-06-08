import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/constants";

/** Where each role's home lives — used to bounce users out of foreign routes. */
function homeFor(role: Role): string {
  if (role === "owner") return "/owner";
  if (role === "teacher") return "/teacher";
  return "/student/classes";
}

/**
 * Server-component guard. Ensures a session exists and the caller's role is in
 * `allowed`; otherwise redirects (to /login when unauthenticated, or to the
 * caller's own home when the role is wrong). Returns the verified id + role.
 *
 * This is defense-in-depth on top of database RLS: RLS already blocks the data,
 * but this stops wrong-role users from ever rendering a page they shouldn't see.
 */
export async function requireRole(
  allowed: Role[]
): Promise<{ userId: string; role: Role }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: Role }>();

  if (!profile) redirect("/login");
  if (!allowed.includes(profile.role)) redirect(homeFor(profile.role));

  return { userId: user.id, role: profile.role };
}

/**
 * Server-action guard. Verifies the caller is authenticated and (optionally)
 * holds one of `allowed` roles. Returns a discriminated result instead of
 * redirecting, so actions can surface a friendly error to the client.
 */
export async function requireRoleAction(allowed?: Role[]): Promise<
  | { ok: true; userId: string; role: Role; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: Role }>();

  if (!profile) return { ok: false, error: "Not authenticated" };
  if (allowed && !allowed.includes(profile.role)) {
    return { ok: false, error: "Not authorized" };
  }
  return { ok: true, userId: user.id, role: profile.role, supabase };
}
