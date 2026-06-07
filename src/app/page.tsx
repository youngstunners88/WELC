import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { WelcMark } from "@/components/brand/WelcMark";
import { LanguageToggle } from "@/components/nav/LanguageToggle";

export default async function LandingPage() {
  const dict = await getDictionary();

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between p-4">
        <WelcMark className="h-10" />
        <LanguageToggle />
      </header>

      <section className="container flex flex-1 flex-col items-center justify-center gap-8 py-16 text-center">
        <WelcMark className="h-24" />
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {dict.landing.headline}
          </h1>
          <p className="mx-auto max-w-md text-muted-foreground">
            {dict.landing.sub}
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/login">{dict.landing.cta}</Link>
        </Button>
        <p className="text-sm text-muted-foreground">{dict.brand.tagline}</p>
      </section>
    </main>
  );
}
