"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n";

type Status = "loading" | "disabled" | "enrolling" | "enabled";

export function TwoFactorCard({ dict }: { dict: Dictionary }) {
  const t = dict.security;
  const supabase = createClient();

  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setStatus("disabled");
      return;
    }
    const verified = (data?.totp ?? []).find((f) => f.status === "verified");
    if (verified) {
      setFactorId(verified.id);
      setStatus("enabled");
    } else {
      setStatus("disabled");
    }
  }, [supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function startEnroll() {
    setBusy(true);
    try {
      // Clear any half-finished TOTP factors so enroll doesn't collide.
      const { data: existing } = await supabase.auth.mfa.listFactors();
      for (const f of existing?.totp ?? []) {
        if (f.status !== "verified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `WELC-${Date.now()}`,
      });
      if (error || !data) {
        toast.error(error?.message ?? t.errEnroll);
        return;
      }
      setFactorId(data.id);
      setQrSvg(data.totp.qr_code);
      setSecret(data.totp.secret);
      setStatus("enrolling");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!factorId || code.trim().length < 6) return;
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
      toast.success(t.enabledToast);
      setQrSvg(null);
      setSecret(null);
      setCode("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!factorId) return;
    if (!confirm(t.disableConfirm)) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(t.disabledToast);
      setFactorId(null);
      setStatus("disabled");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {dict.common.loading}
      </div>
    );
  }

  if (status === "enabled") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800">
          <ShieldCheck className="h-5 w-5" />
          {t.enabled}
        </div>
        <p className="text-xs text-muted-foreground">{t.enabledHint}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={disable}
          disabled={busy}
          className="gap-2 text-destructive hover:text-destructive"
        >
          <ShieldOff className="h-4 w-4" />
          {t.disable}
        </Button>
      </div>
    );
  }

  if (status === "enrolling") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t.scanHint}</p>
        {qrSvg && (
          <div className="flex justify-center">
            {qrSvg.startsWith("data:") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrSvg} alt="2FA QR" className="h-44 w-44" />
            ) : (
              <div
                className="h-44 w-44 [&_svg]:h-full [&_svg]:w-full"
                // Supabase returns a self-contained SVG string for the QR code.
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            )}
          </div>
        )}
        {secret && (
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-center">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t.manualKey}
            </p>
            <code className="break-all text-xs font-semibold">{secret}</code>
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t.enterCode}</label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="000000"
            className="text-center text-lg tracking-[0.4em]"
          />
        </div>
        <Button
          onClick={verify}
          disabled={busy || code.length < 6}
          className="w-full gap-2 bg-[#0f1e4a] hover:bg-[#0f1e4a]/90"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {t.verifyEnable}
        </Button>
      </div>
    );
  }

  // disabled
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t.disabledHint}</p>
      <Button onClick={startEnroll} disabled={busy} className="gap-2 bg-[#0f1e4a] hover:bg-[#0f1e4a]/90">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        {t.enable}
      </Button>
    </div>
  );
}
