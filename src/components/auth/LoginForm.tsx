"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signIn, signUp } from "@/app/(auth)/login/actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Dictionary } from "@/lib/i18n";

export function LoginForm({
  dict,
  referredBy,
}: {
  dict: Dictionary;
  referredBy?: string;
}) {
  const [mode, setMode] = useState<"login" | "signup">(
    referredBy ? "signup" : "login"
  );
  const [isPending, startTransition] = useTransition();
  const [oauthPending, setOauthPending] = useState<"google" | null>(null);
  const router = useRouter();

  async function onOAuth(provider: "google") {
    setOauthPending(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      toast.error(error.message);
      setOauthPending(null);
    }
    // On success the browser is redirected away to the provider, so there's
    // nothing further to do here.
  }

  function onSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("fullName") ?? "");
    const requestedRole =
      String(formData.get("requested_role") ?? "student") === "teacher"
        ? "teacher"
        : "student";

    startTransition(async () => {
      if (mode === "login") {
        // signIn redirects on success, so we only return here on error.
        const result = await signIn(email, password);
        if (result?.error) toast.error(result.error);
        return;
      }

      const result = await signUp(
        email,
        password,
        fullName,
        requestedRole,
        referredBy
      );
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (result?.pending) toast.success(dict.auth.teacherPending);
      router.push("/student/classes");
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          disabled={oauthPending !== null}
          onClick={() => onOAuth("google")}
        >
          <svg viewBox="0 0 48 48" className="h-4 w-4 shrink-0" aria-hidden>
            <path
              fill="#FFC107"
              d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4c-7.6 0-14.1 4.3-17.7 10.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6c-2.1 1.6-4.8 2.6-7.7 2.6-5.2 0-9.6-3.3-11.3-7.9l-6.6 5C9.8 39.6 16.3 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.4 36 44 30.6 44 24c0-1.3-.1-2.7-.4-3.5z"
            />
          </svg>
          {oauthPending === "google" ? dict.common.loading : dict.auth.continueWithGoogle}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">{dict.auth.orContinueWith}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

    <form action={onSubmit} className="space-y-4">
      {mode === "signup" && referredBy && (
        <div className="rounded-lg border border-[#F7C905]/40 bg-[#F7C905]/10 px-3 py-2 text-sm text-foreground">
          {dict.referral.invitedBy} ✓
        </div>
      )}
      {mode === "signup" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="fullName">{dict.auth.name}</Label>
            <Input id="fullName" name="fullName" required autoComplete="name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="requested_role">{dict.auth.iAmA}</Label>
            <Select id="requested_role" name="requested_role" defaultValue="student">
              <option value="student">{dict.auth.roleStudent}</option>
              <option value="teacher">{dict.auth.roleTeacher}</option>
            </Select>
          </div>
        </>
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
    </div>
  );
}
