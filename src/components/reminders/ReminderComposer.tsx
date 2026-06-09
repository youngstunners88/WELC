"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Clock } from "lucide-react";
import {
  sendReminderNow,
  scheduleReminder,
  type Audience,
} from "@/app/(dashboard)/owner/reminders/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Dictionary } from "@/lib/i18n";

export interface SessionOption {
  id: string;
  label: string;
}

export function ReminderComposer({
  sessions,
  dict,
}: {
  sessions: SessionOption[];
  dict: Dictionary;
}) {
  const router = useRouter();
  const [audience, setAudience] = useState<Audience>("tomorrow");
  const [sessionId, setSessionId] = useState("");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [sendAt, setSendAt] = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setMessage("");
    setSendAt("");
    router.refresh();
  }

  function submit() {
    if (!message.trim()) {
      toast.error(dict.reminders.messageRequired);
      return;
    }
    if (audience === "session" && !sessionId) {
      toast.error(dict.reminders.pickSession);
      return;
    }
    const sid = audience === "session" ? sessionId : null;

    startTransition(async () => {
      if (mode === "now") {
        const res = await sendReminderNow(audience, sid, message);
        if (res?.error) {
          toast.error(res.error);
          return;
        }
        const k = res.kakaoConfigured ? ` · KakaoTalk ${res.kakaoSent}` : "";
        toast.success(`${dict.reminders.sent}: ${res.count}${k}`);
        reset();
      } else {
        if (!sendAt) {
          toast.error(dict.reminders.pickTime);
          return;
        }
        const res = await scheduleReminder(
          audience,
          sid,
          message,
          new Date(sendAt).toISOString()
        );
        if (res?.error) {
          toast.error(res.error);
          return;
        }
        toast.success(dict.reminders.scheduled);
        reset();
      }
    });
  }

  return (
    <Card className="welc-card-glow">
      <CardHeader>
        <CardTitle className="text-base">{dict.reminders.compose}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="audience">{dict.reminders.audience}</Label>
            <Select
              id="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value as Audience)}
            >
              <option value="tomorrow">{dict.reminders.audTomorrow}</option>
              <option value="session">{dict.reminders.audSession}</option>
              <option value="all_students">{dict.reminders.audAll}</option>
            </Select>
          </div>
          {audience === "session" && (
            <div className="space-y-1.5">
              <Label htmlFor="session">{dict.reminders.session}</Label>
              <Select
                id="session"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
              >
                <option value="">—</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="message">{dict.reminders.message}</Label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={dict.reminders.messagePlaceholder}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f1e4a]/20"
          />
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("now")}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
              mode === "now"
                ? "border-[#0f1e4a] bg-[#0f1e4a] text-white"
                : "hover:bg-muted"
            }`}
          >
            {dict.reminders.sendNow}
          </button>
          <button
            type="button"
            onClick={() => setMode("schedule")}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
              mode === "schedule"
                ? "border-[#0f1e4a] bg-[#0f1e4a] text-white"
                : "hover:bg-muted"
            }`}
          >
            {dict.reminders.schedule}
          </button>
        </div>

        {mode === "schedule" && (
          <div className="space-y-1.5">
            <Label htmlFor="sendAt">{dict.reminders.when}</Label>
            <Input
              id="sendAt"
              type="datetime-local"
              value={sendAt}
              onChange={(e) => setSendAt(e.target.value)}
            />
          </div>
        )}

        <Button onClick={submit} disabled={isPending} className="w-full gap-2">
          {mode === "now" ? (
            <Send className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
          {mode === "now" ? dict.reminders.sendNow : dict.reminders.schedule}
        </Button>
      </CardContent>
    </Card>
  );
}
