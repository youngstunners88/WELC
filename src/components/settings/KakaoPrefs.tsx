"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { updateKakaoConsent } from "@/app/(dashboard)/settings/actions";
import type { Dictionary } from "@/lib/i18n";

export function KakaoPrefs({
  initialConsent,
  hasPhone,
  dict,
}: {
  initialConsent: boolean;
  hasPhone: boolean;
  dict: Dictionary;
}) {
  const [consent, setConsent] = useState(initialConsent);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !consent;
    setConsent(next);
    startTransition(async () => {
      const res = await updateKakaoConsent(next);
      if (res?.error) {
        setConsent(!next);
        toast.error(res.error);
      } else {
        toast.success(dict.settings.saved);
      }
    });
  }

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={consent}
          onChange={toggle}
          disabled={isPending}
          className="mt-1 h-4 w-4 accent-[#FEE500]"
        />
        <span className="text-sm">
          <span className="flex items-center gap-1.5 font-medium">
            <MessageCircle className="h-4 w-4" />
            {dict.settings.kakaoConsent}
          </span>
          <span className="text-muted-foreground">
            {dict.settings.kakaoConsentHint}
          </span>
        </span>
      </label>
      {consent && !hasPhone && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {dict.settings.kakaoNoPhone}
        </p>
      )}
    </div>
  );
}
