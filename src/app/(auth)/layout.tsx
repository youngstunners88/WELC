import { WelcWordmark } from "@/components/brand/WelcMark";
import { getLocale } from "@/lib/i18n";
import { LanguageToggle } from "@/components/nav/LanguageToggle";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <main className="flex min-h-screen flex-col bg-muted/40">
      <header className="flex items-center justify-between p-4">
        <WelcWordmark />
        <LanguageToggle current={locale} />
      </header>
      <div className="flex flex-1 items-center justify-center p-4">
        {children}
      </div>
    </main>
  );
}
