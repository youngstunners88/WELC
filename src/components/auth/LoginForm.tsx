"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { signIn, signUp } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dictionary } from "@/lib/i18n";

export function LoginForm({ dict }: { dict: Dictionary }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("fullName") ?? "");

    startTransition(async () => {
      const result =
        mode === "login"
          ? await signIn(email, password)
          : await signUp(email, password, fullName);
      // On success the server action redirects (throws), so we only get here on error.
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      {mode === "signup" && (
        <div className="space-y-1.5">
          <Label htmlFor="fullName">{dict.auth.name}</Label>
          <Input id="fullName" name="fullName" required autoComplete="name" />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">{dict.auth.email}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">{dict.auth.password}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending
          ? dict.common.loading
          : mode === "login"
            ? dict.auth.login
            : dict.auth.signup}
      </Button>
      <button
        type="button"
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
      >
        {mode === "login" ? dict.auth.needAccount : dict.auth.haveAccount}
      </button>
    </form>
  );
}
