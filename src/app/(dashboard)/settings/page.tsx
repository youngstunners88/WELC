import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { TwoFactorCard } from "@/components/settings/TwoFactorCard";
import { DataRights } from "@/components/settings/DataRights";
import type { Profile } from "@/types/database";

export default async function SettingsPage() {
  const supabase = await createClient();
  const dict = await getDictionary();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id ?? "")
    .single<Profile>();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">{dict.settings.title}</h1>
      <Card className="welc-card-glow">
        <CardHeader>
          <CardTitle className="text-base">{dict.settings.profile}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initialName={profile?.full_name ?? ""}
            initialPhone={profile?.phone ?? ""}
            email={profile?.email ?? user?.email ?? ""}
            dict={dict}
          />
        </CardContent>
      </Card>

      {profile?.role === "owner" && (
        <Card className="welc-card-glow border-t-4 border-t-[#0f1e4a]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-[#0f1e4a]" />
              {dict.security.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TwoFactorCard dict={dict} />
          </CardContent>
        </Card>
      )}

      <Card className="welc-card-glow">
        <CardHeader>
          <CardTitle className="text-base">{dict.dataRights.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataRights dict={dict} />
        </CardContent>
      </Card>
    </div>
  );
}
