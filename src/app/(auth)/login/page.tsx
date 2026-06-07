import { getDictionary } from "@/lib/i18n";
import { LoginForm } from "@/components/auth/LoginForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function LoginPage() {
  const dict = await getDictionary();
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle>{dict.brand.name}</CardTitle>
        <CardDescription>{dict.brand.tagline}</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm dict={dict} />
      </CardContent>
    </Card>
  );
}
