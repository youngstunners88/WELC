"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Megaphone,
  Users,
  GraduationCap,
  Globe,
  Send,
  CheckSquare,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { sendBroadcast, scheduleBroadcast } from "@/app/(dashboard)/messages/actions";
import type { Dictionary } from "@/lib/i18n";

type Audience = "all" | "teachers" | "students";
type Recurrence = "none" | "weekly" | "monthly";

export function BroadcastComposer({ dict }: { dict: Dictionary }) {
  const m = dict.messages;
  const [audience, setAudience] = useState<Audience>("all");
  const [body, setBody] = useState("");
  const [requireAck, setRequireAck] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [sendAt, setSendAt] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const options: { key: Audience; label: string; icon: typeof Users }[] = [
    { key: "all", label: m.audAll, icon: Globe },
    { key: "teachers", label: m.audTeachers, icon: Users },
    { key: "students", label: m.audStudents, icon: GraduationCap },
  ];

  function submit() {
    const text = body.trim();
    if (!text) return;
    startTransition(async () => {
      if (scheduled) {
        if (!sendAt) {
          toast.error(m.pickTime);
          return;
        }
        const res = await scheduleBroadcast(
          audience,
          text,
          requireAck,
          new Date(sendAt).toISOString(),
          recurrence
        );
        if (res?.error) {
          toast.error(res.error);
          return;
        }
        toast.success(m.scheduled);
      } else {
        const res = await sendBroadcast(audience, text, requireAck);
        if (res?.error) {
          toast.error(res.error);
          return;
        }
        toast.success(m.sentTo.replace("{n}", String(res.count ?? 0)));
      }
      setBody("");
      setSendAt("");
      router.refresh();
    });
  }

  return (
    <div className="welc-card-glow rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-[#0f1e4a] p-2 text-[#F7C905]">
          <Megaphone className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold">{m.broadcastTitle}</p>
          <p className="text-xs text-muted-foreground">{m.broadcastHint}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((o) => {
          const Icon = o.icon;
          const active = audience === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => setAudience(o.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-[#0f1e4a] bg-[#0f1e4a] text-white"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {o.label}
            </button>
          );
        })}
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder={m.broadcastPlaceholder}
        className="mt-3 w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0f1e4a]/20"
      />

      {/* Options */}
      <div className="mt-3 flex flex-wrap gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={requireAck}
            onChange={(e) => setRequireAck(e.target.checked)}
            className="h-4 w-4 accent-[#0f1e4a]"
          />
          <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
          {m.requireAck}
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={scheduled}
            onChange={(e) => setScheduled(e.target.checked)}
            className="h-4 w-4 accent-[#0f1e4a]"
          />
          <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
          {m.scheduleLater}
        </label>
      </div>

      {scheduled && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            type="datetime-local"
            value={sendAt}
            onChange={(e) => setSendAt(e.target.value)}
            className="rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f1e4a]/20"
          />
          <Select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as Recurrence)}
          >
            <option value="none">{m.recurNone}</option>
            <option value="weekly">{m.recurWeekly}</option>
            <option value="monthly">{m.recurMonthly}</option>
          </Select>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{m.encryptedNote}</span>
        <Button
          onClick={submit}
          disabled={isPending || !body.trim()}
          className="gap-2 bg-[#0f1e4a] hover:bg-[#0f1e4a]/90"
        >
          {scheduled ? (
            <CalendarClock className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {scheduled ? m.scheduleBroadcast : m.sendBroadcast}
        </Button>
      </div>
    </div>
  );
}
