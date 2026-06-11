import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";

// Owner-only segment. Wrong-role users are bounced to their own home.
export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["owner"]);

  // Step-up enforcement: if the owner has enrolled a second factor but this
  // session is still AAL1, require the TOTP challenge before any owner page
  // renders. (No-op for owners who haven't enabled 2FA.)
  const supabase = await createClient();
  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    redirect("/mfa");
  }

  return <>{children}</>;
}
