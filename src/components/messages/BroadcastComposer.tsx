"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Megaphone, Users, GraduationCap, Globe, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sendBroadcast } from "@/app/(dashboard)/messages/actions";
import type { Dictionary } from "@/lib/i18n";

type Audience = "all" | "teachers" | "students";

export function BroadcastComposer({ dict }: { dict: Dictionary }) {
  const m = dict.messages;
  const [audience, setAudience] = useState<Audience>("all");
  const [body, setBody] = useState("");
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
      const res = await sendBroadcast(audience, text);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(m.sentTo.replace("{n}", String(res.count ?? 0)));
      setBody("");
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

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{m.encryptedNote}</span>
        <Button
          onClick={submit}
          disabled={isPending || !body.trim()}
          className="gap-2 bg-[#0f1e4a] hover:bg-[#0f1e4a]/90"
        >
          <Send className="h-4 w-4" />
          {m.sendBroadcast}
        </Button>
      </div>
    </div>
  );
}
