"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import {
  commitToSession,
  uncommitFromSession,
} from "@/app/(dashboard)/student/classes/actions";
import { Button } from "@/components/ui/button";
import { canCommit, canUncommit } from "@/lib/commitments";
import type { Dictionary } from "@/lib/i18n";

export function CommitButton({
  sessionId,
  scheduledAt,
  commitmentId,
  dict,
}: {
  sessionId: string;
  scheduledAt: string;
  commitmentId: string | null;
  dict: Dictionary;
}) {
  const [isPending, startTransition] = useTransition();
  const scheduled = new Date(scheduledAt);
  const committed = commitmentId !== null;

  const disabled = committed
    ? !canUncommit(scheduled)
    : !canCommit(scheduled);

  function onClick() {
    startTransition(async () => {
      const result = committed
        ? await uncommitFromSession(commitmentId!)
        : await commitToSession(sessionId);
      if (result?.error) toast.error(result.error);
      else
        toast.success(
          committed ? dict.student.uncommit : dict.student.committed
        );
    });
  }

  if (committed) {
    return (
      <Button
        onClick={onClick}
        disabled={isPending || disabled}
        variant="outline"
        size="sm"
        className="gap-1.5"
      >
        <Check className="h-4 w-4 text-emerald-600" />
        {disabled ? dict.student.committed : dict.student.uncommit}
      </Button>
    );
  }

  return (
    <Button onClick={onClick} disabled={isPending || disabled} size="sm">
      {dict.student.commit}
    </Button>
  );
}
