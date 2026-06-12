"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Send, Check } from "lucide-react";
import { ownerDm } from "@/app/(dashboard)/messages/actions";

/**
 * Owner-only: DM a teacher their composed monthly summary. The message text is
 * built server-side and passed in, so encryption still happens in the action.
 */
export function SendDigestButton({
  teacherId,
  message,
  label,
  sentLabel,
}: {
  teacherId: string;
  message: string;
  label: string;
  sentLabel: string;
}) {
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (sent) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
        <Check className="h-3.5 w-3.5" />
        {sentLabel}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const res = await ownerDm(teacherId, message);
          if (res?.error) {
            toast.error(res.error);
            return;
          }
          setSent(true);
          toast.success(sentLabel);
        })
      }
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium text-[#0f1e4a] hover:bg-[#0f1e4a]/5 disabled:opacity-60"
    >
      <Send className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
