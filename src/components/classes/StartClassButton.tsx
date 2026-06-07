"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play } from "lucide-react";
import { startSession } from "@/app/(dashboard)/teacher/attendance/actions";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n";

export function StartClassButton({
  sessionId,
  dict,
}: {
  sessionId: string;
  dict: Dictionary;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onClick() {
    startTransition(async () => {
      const result = await startSession(sessionId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        router.push(`/teacher/attendance/${sessionId}`);
      }
    });
  }

  return (
    <Button onClick={onClick} disabled={isPending} className="gap-2">
      <Play className="h-4 w-4" />
      {dict.teacher.startClass}
    </Button>
  );
}
