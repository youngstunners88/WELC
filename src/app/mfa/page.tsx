import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { MfaChallenge } from "@/components/auth/MfaChallenge";
import { WelcMark } from "@/components/brand/WelcMark";

// Second-factor step-up page. Reached when an owner with 2FA enrolled has a
// session that is still only AAL1.
export default async function MfaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dict = await getDictionary();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6">
      <WelcMark className="h-12" />
      <MfaChallenge dict={dict} />
    </div>
  );
}
