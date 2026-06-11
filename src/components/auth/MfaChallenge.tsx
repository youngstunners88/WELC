"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n";

export function MfaChallenge({ dict }: { dict: Dictionary }) {
  const t = dict.security;
  const supabase = createClient();
  const router = useRouter();

  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = (data?.totp ?? []).find((f) => f.status === "verified");
      if (!verified) {
        // No factor to satisfy — nothing to challenge; send them home.
        router.replace("/owner");
        return;
      }
      setFactorId(verified.id);
      setReady(true);
    })();
  }, [supabase, router]);

  async function submit() {
    if (!factorId || code.length < 6) return;
    setBusy(true);
    try {
      const { data: challenge, error: cErr } =
        await supabase.auth.mfa.challenge({ factorId });
      if (cErr || !challenge) {
        toast.error(cErr?.message ?? t.errVerify);
        return;
      }
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.trim(),
      });
      if (vErr) {
        toast.error(vErr.message ?? t.errVerify);
        return;
      }
      router.replace("/owner");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0f1e4a] text-[#F7C905]">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold">{t.challengeTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.challengeHint}</p>
      </div>

      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        inputMode="numeric"
        autoFocus
        placeholder="000000"
        disabled={!ready || busy}
        className="text-center text-2xl tracking-[0.5em]"
      />

      <Button
        onClick={submit}
        disabled={!ready || busy || code.length < 6}
        className="w-full gap-2 bg-[#0f1e4a] hover:bg-[#0f1e4a]/90"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {t.verify}
      </Button>

      <button
        type="button"
        onClick={signOut}
        className="flex w-full items-center justify-center gap-1.5 text-center text-sm text-muted-foreground hover:text-foreground"
      >
        <LogOut className="h-3.5 w-3.5" />
        {dict.nav.logout}
      </button>
    </div>
  );
}
