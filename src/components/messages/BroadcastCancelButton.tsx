"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { cancelBroadcast } from "@/app/(dashboard)/messages/actions";

export function BroadcastCancelButton({
  broadcastId,
  label,
}: {
  broadcastId: string;
  label: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const res = await cancelBroadcast(broadcastId);
          if (res?.error) {
            toast.error(res.error);
            return;
          }
          router.refresh();
        })
      }
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
    >
      <X className="h-3 w-3" />
      {label}
    </button>
  );
}
