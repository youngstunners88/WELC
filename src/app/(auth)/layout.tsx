import { WelcBrandPanel, WelcWordmark } from "@/components/brand/WelcMark";
import { getLocale } from "@/lib/i18n";
import { LanguageToggle } from "@/components/nav/LanguageToggle";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — hidden on mobile */}
      <div className="hidden lg:block">
        <WelcBrandPanel />
      </div>

      {/* Form side */}
      <div className="flex flex-col bg-background">
        <header className="flex items-center justify-between p-5">
          {/* Show wordmark on mobile where brand panel is hidden */}
          <div className="lg:hidden">
            <WelcWordmark />
          </div>
          <div className="hidden lg:block" />
          <LanguageToggle current={locale} />
        </header>
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          {children}
        </div>
      </div>
    </div>
  );
}
