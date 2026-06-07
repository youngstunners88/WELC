import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, getLocale } from "@/lib/i18n";
import { DashboardNav } from "@/components/nav/DashboardNav";
import { NotificationBell } from "@/components/nav/NotificationBell";
import { LanguageToggle } from "@/components/nav/LanguageToggle";
import type { Notification, Profile } from "@/types/database";
import type { Role } from "@/lib/constants";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) redirect("/login");

  const role = profile.role as Role;
  const dict = await getDictionary();
  const locale = await getLocale();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <DashboardNav role={role} dict={dict} profile={profile} />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b px-4 py-3">
          <LanguageToggle current={locale} />
          <NotificationBell
            userId={user.id}
            initial={(notifications ?? []) as Notification[]}
            dict={dict}
          />
        </header>
        <main className="container flex-1 py-6">{children}</main>
      </div>
    </div>
  );
}
