"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ShieldCheck } from "lucide-react";
import { ackMessage } from "@/app/(dashboard)/messages/actions";

export function AckButton({
  messageId,
  acked,
  ackLabel,
  ackedLabel,
}: {
  messageId: string;
  acked: boolean;
  ackLabel: string;
  ackedLabel: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (acked) {
    return (
      <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
        <ShieldCheck className="h-3.5 w-3.5" />
        {ackedLabel}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const res = await ackMessage(messageId);
          if (res?.error) {
            toast.error(res.error);
            return;
          }
          router.refresh();
        })
      }
      className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#F7C905] px-2.5 py-1 text-[11px] font-bold text-[#0f1e4a] hover:bg-[#F7C905]/90 disabled:opacity-60"
    >
      <Check className="h-3.5 w-3.5" />
      {ackLabel}
    </button>
  );
}
