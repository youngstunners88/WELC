import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import type { Role } from "@/lib/constants";

/**
 * OAuth redirect target for Google / Kakao sign-in (configured as a Supabase
 * Auth provider — see Supabase Dashboard → Authentication → Providers). This
 * exchanges the auth code for a session, then routes the user to their role's
 * home, exactly like the password-based signIn action does.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single<{ role: Role }>();

  await logAudit(supabase, "auth.login", "user", user?.id ?? null, {
    role: profile?.role ?? null,
    method: "oauth",
  });

  const home =
    profile?.role === "owner"
      ? "/owner"
      : profile?.role === "teacher"
        ? "/teacher"
        : "/student/classes";

  return NextResponse.redirect(`${origin}${home}`);
}
