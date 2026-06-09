import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { KakaoPrefs } from "@/components/settings/KakaoPrefs";
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

      <Card className="welc-card-glow">
        <CardHeader>
          <CardTitle className="text-base">
            {dict.settings.notifications}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <KakaoPrefs
            initialConsent={Boolean(
              (profile as Profile & { kakao_alimtalk_consent?: boolean })
                ?.kakao_alimtalk_consent
            )}
            hasPhone={Boolean(profile?.phone)}
            dict={dict}
          />
        </CardContent>
      </Card>
    </div>
  );
}
