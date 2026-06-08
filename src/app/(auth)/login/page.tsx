import { getDictionary } from "@/lib/i18n";
import { LoginForm } from "@/components/auth/LoginForm";
import { WelcMark } from "@/components/brand/WelcMark";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { ref?: string };
}) {
  const dict = await getDictionary();
  const referredBy =
    typeof searchParams.ref === "string" ? searchParams.ref : undefined;
  return (
    <div className="w-full max-w-sm space-y-8">
      {/* Mark + heading */}
      <div className="space-y-2">
        <WelcMark className="h-12" />
        <h1 className="text-2xl font-bold tracking-tight">
          {dict.auth.welcomeBack ?? "Welcome back"}
        </h1>
        <p className="text-sm text-muted-foreground">{dict.brand.tagline}</p>
      </div>

      <LoginForm dict={dict} referredBy={referredBy} />
    </div>
  );
}
