"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateProfile } from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dictionary } from "@/lib/i18n";

export function ProfileForm({
  initialName,
  initialPhone,
  email,
  dict,
}: {
  initialName: string;
  initialPhone: string;
  email: string;
  dict: Dictionary;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateProfile(name, phone);
      if (res?.error) toast.error(res.error);
      else {
        toast.success(dict.settings.saved);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">{dict.auth.email}</Label>
        <Input id="email" value={email} disabled />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="fullName">{dict.settings.displayName}</Label>
        <Input
          id="fullName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
        />
        <p className="text-xs text-muted-foreground">{dict.settings.nameHint}</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">{dict.settings.phone}</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? dict.common.loading : dict.common.save}
      </Button>
    </form>
  );
}
