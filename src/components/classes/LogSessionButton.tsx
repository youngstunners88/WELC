"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardCheck } from "lucide-react";
import { logSession } from "@/app/(dashboard)/teacher/attendance/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Dictionary } from "@/lib/i18n";

export function LogSessionButton({
  sessionId,
  defaultMinutes,
  dict,
}: {
  sessionId: string;
  defaultMinutes: number;
  dict: Dictionary;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(String(defaultMinutes || 60));
  const [isPending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const res = await logSession(sessionId, Number(minutes));
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(dict.log.logged);
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ClipboardCheck className="h-4 w-4" />
          {dict.log.logSession}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{dict.log.logPast}</DialogTitle>
          <DialogDescription>{dict.teacher.hoursThisMonth}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="minutes">{dict.log.minutes}</Label>
          <Input
            id="minutes"
            type="number"
            min={1}
            max={600}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={onConfirm} disabled={isPending} className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            {isPending ? dict.common.loading : dict.log.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
