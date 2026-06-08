"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signIn, signUp } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Dictionary } from "@/lib/i18n";

export function LoginForm({ dict }: { dict: Dictionary }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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

      const result = await signUp(email, password, fullName, requestedRole);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (result?.pending) toast.success(dict.auth.teacherPending);
      router.push("/student/classes");
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
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
  );
}
