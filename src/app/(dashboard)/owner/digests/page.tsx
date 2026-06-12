import { LineChart, Clock, Users, AlertTriangle, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, getLocale } from "@/lib/i18n";
import { FlightMotif } from "@/components/brand/FlightMotif";
import { Badge } from "@/components/ui/badge";
import { SendDigestButton } from "@/components/messages/SendDigestButton";
import { isMessagingConfigured } from "@/lib/crypto/messages";
import type { TeacherDigestRow } from "@/types/database";

function monthLabel(locale: string) {
  return new Date().toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "long",
  });
}

export default async function OwnerDigestsPage() {
  const dict = await getDictionary();
  const locale = await getLocale();
  const d = dict.digests;
  const supabase = await createClient();

  const { data } = await supabase.rpc("rpc_teacher_digests", {
    p_month: new Date().toISOString().slice(0, 10),
  });
  const rows = (data as TeacherDigestRow[] | null) ?? [];
  const canDm = isMessagingConfigured();

  const composeMessage = (r: TeacherDigestRow): string =>
    `${r.teacher_name} ${d.dmGreeting}\n` +
    `• ${d.sessions}: ${r.sessions} (${Number(r.hours).toFixed(1)}${d.hoursUnit})\n` +
    `• ${d.attendance}: ${r.attendance_rate ?? 0}%\n` +
    `• ${d.students}: ${r.students} (${d.atRisk} ${r.at_risk})`;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="welc-sky welc-glint welc-rise relative overflow-hidden rounded-2xl px-8 py-7 text-white shadow-md">
        <FlightMotif />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#F7C905]">
            <LineChart className="h-4 w-4" />
            {monthLabel(locale)}
          </div>
          <h1 className="mt-2 text-2xl font-bold">{d.title}</h1>
          <p className="mt-1 text-sm text-white/60">{d.subtitle}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          {d.empty}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rows.map((r) => (
            <div
              key={r.teacher_id}
              className="welc-card-glow welc-card-hover rounded-2xl border bg-card p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0f1e4a] text-sm font-bold text-[#F7C905]">
                    {r.teacher_name.slice(0, 1).toUpperCase()}
                  </div>
                  <p className="font-semibold">{r.teacher_name}</p>
                </div>
                {r.at_risk > 0 && (
                  <Badge variant="warning" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {r.at_risk}
                  </Badge>
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <Metric
                  icon={Clock}
                  label={d.hours}
                  value={Number(r.hours).toFixed(1)}
                />
                <Metric
                  icon={TrendingUp}
                  label={d.attendance}
                  value={`${r.attendance_rate ?? 0}%`}
                />
                <Metric icon={Users} label={d.students} value={String(r.students)} />
              </div>

              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <span className="text-xs text-muted-foreground">
                  {d.sessions}: {r.sessions}
                </span>
                {canDm && (
                  <SendDigestButton
                    teacherId={r.teacher_id}
                    message={composeMessage(r)}
                    label={d.sendToTeacher}
                    sentLabel={d.sent}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <Icon className="mx-auto h-4 w-4 text-[#0f1e4a]" />
      <p className="mt-1 text-lg font-bold tabular-nums text-[#0f1e4a]">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
