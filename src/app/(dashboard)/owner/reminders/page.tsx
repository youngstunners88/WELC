import { Bell, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import {
  ReminderComposer,
  type SessionOption,
} from "@/components/reminders/ReminderComposer";
import { CancelReminderButton } from "@/components/reminders/CancelReminderButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/datetime";
import type { Class, ClassSession } from "@/types/database";

interface SessionRow extends Pick<ClassSession, "id" | "scheduled_at"> {
  classes: Pick<Class, "name"> | null;
}

interface ScheduledRow {
  id: string;
  audience: string;
  message: string;
  send_at: string;
  status: string;
  sent_count: number | null;
}

export default async function OwnerRemindersPage() {
  const supabase = await createClient();
  const dict = await getDictionary();

  const nowIso = new Date().toISOString();
  const in30d = new Date(Date.now() + 30 * 864e5).toISOString();

  const { data: sessions } = await supabase
    .from("class_sessions")
    .select("id, scheduled_at, classes!inner(name)")
    .gte("scheduled_at", nowIso)
    .lte("scheduled_at", in30d)
    .order("scheduled_at")
    .limit(60);

  const sessionOptions: SessionOption[] = (
    (sessions as SessionRow[] | null) ?? []
  ).map((s) => ({
    id: s.id,
    label: `${s.classes?.name ?? "—"} · ${formatDateTime(s.scheduled_at)}`,
  }));

  // scheduled_reminders may not exist before the 20260608 migration — degrade.
  const { data: scheduled } = await supabase
    .from("scheduled_reminders")
    .select("id, audience, message, send_at, status, sent_count")
    .order("send_at", { ascending: true });
  const upcoming = ((scheduled as ScheduledRow[] | null) ?? []).filter(
    (r) => r.status === "pending"
  );

  const audienceLabel: Record<string, string> = {
    tomorrow: dict.reminders.audTomorrow,
    session: dict.reminders.audSession,
    all_students: dict.reminders.audAll,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Bell className="h-6 w-6 text-[#0f1e4a]" />
          {dict.reminders.title}
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MessageCircle className="h-4 w-4" />
          {dict.reminders.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ReminderComposer sessions={sessionOptions} dict={dict} />

        <Card className="welc-card-glow">
          <CardHeader>
            <CardTitle className="text-base">
              {dict.reminders.upcoming}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {dict.reminders.none}
              </p>
            ) : (
              upcoming.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-2 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {audienceLabel[r.audience] ?? r.audience}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(r.send_at)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm">{r.message}</p>
                  </div>
                  <CancelReminderButton
                    id={r.id}
                    label={dict.reminders.cancelled}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
