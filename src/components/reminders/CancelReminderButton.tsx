"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { cancelReminder } from "@/app/(dashboard)/owner/reminders/actions";
import { Button } from "@/components/ui/button";

export function CancelReminderButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const res = await cancelReminder(id);
          if (res?.error) toast.error(res.error);
          else {
            toast.success(label);
            router.refresh();
          }
        })
      }
    >
      <X className="h-4 w-4" />
    </Button>
  );
}
