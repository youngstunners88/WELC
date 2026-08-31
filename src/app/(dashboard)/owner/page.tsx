import Link from "next/link";
import {
  PlaneTakeoff,
  Clock,
  TrendingUp,
  AlertTriangle,
  Users,
  ClipboardList,
  BookOpen,
  ChevronRight,
  ScrollText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { formatDateTime } from "@/lib/datetime";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { AttendanceTrend } from "@/components/dashboard/AttendanceTrend";
import { FlightMotif } from "@/components/brand/FlightMotif";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  OwnerDashboardStats,
  DailyAttendanceRow,
  StudentAttendanceRow,
} from "@/types/database";

export default async function OwnerDashboardPage() {
  const supabase = await createClient();
  const dict = await getDictionary();

  const { data: stats } = await supabase.rpc("owner_dashboard_stats");
  const s = (stats as OwnerDashboardStats | null) ?? {
    active_classes: 0,
    total_hours: 0,
    attendance_rate: 0,
    at_risk_count: 0,
  };

  const { data: trend } = await supabase
    .from("v_daily_attendance")
    .select("*");

  const { data: students } = await supabase
    .from("v_student_attendance")
    .select("*")
    .order("missed", { ascending: false });

  const atRisk = ((students as StudentAttendanceRow[] | null) ?? []).filter(
    (st) => st.missed >= 3
  );

  // Live activity — the most recent platform-wide actions, so the owner sees
  // what everyone is doing the moment they land, without opening the full log.
  const { data: recent } = await supabase
    .from("audit_log")
    .select("id, actor_id, actor_role, action, created_at")
    .order("created_at", { ascending: false })
    .limit(8);
  const recentRows =
    (recent as
      | {
          id: string;
          actor_id: string | null;
          actor_role: string | null;
          action: string;
          created_at: string;
        }[]
      | null) ?? [];

  const actorIds = Array.from(
    new Set(recentRows.map((r) => r.actor_id).filter(Boolean))
  ) as string[];
  let actorNames = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", actorIds);
    actorNames = new Map(
      ((profs as { id: string; full_name: string }[] | null) ?? []).map((p) => [
        p.id,
        p.full_name,
      ])
    );
  }

  const actionLabel = (action: string): string =>
    (dict.audit.actions as Record<string, string>)[action] ?? action;

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="space-y-8">
      {/* Command center hero */}
      <div className="welc-sky welc-glint welc-rise relative overflow-hidden rounded-2xl px-8 py-8 text-white shadow-md">
        <FlightMotif />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#F7C905]">
            <PlaneTakeoff className="welc-float h-4 w-4" />
            {dict.owner.commandCenter}
          </div>
          <p className="mt-3 text-sm font-medium text-white/50">{today}</p>
          <h1 className="mt-1 text-2xl font-bold">{dict.owner.welcome}</h1>
          <p className="mt-1 text-sm text-white/60">
            WELC Academy — 위준성 영어 라이프 컨설팅
          </p>
          <div className="welc-runway mt-5 w-48 rounded-full opacity-80" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={dict.owner.activeClasses}
          value={s.active_classes}
          icon={PlaneTakeoff}
          color="navy"
          stagger={1}
        />
        <StatsCard
          title={dict.owner.teacherHours}
          value={s.total_hours}
          icon={Clock}
          color="yellow"
          stagger={2}
        />
        <StatsCard
          title={dict.owner.attendanceRate}
          value={`${s.attendance_rate}%`}
          icon={TrendingUp}
          color="green"
          stagger={3}
        />
        <StatsCard
          title={dict.owner.atRisk}
          value={s.at_risk_count}
          icon={AlertTriangle}
          color="red"
          stagger={4}
        />
      </div>

      {/* Quick actions — control center */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {dict.owner.quickActions}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { href: "/owner/people", label: dict.nav.people, icon: Users },
            { href: "/owner/classes", label: dict.nav.classes, icon: BookOpen },
            {
              href: "/owner/attendance",
              label: dict.nav.attendance,
              icon: ClipboardList,
            },
          ].map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className="welc-card-glow welc-card-hover group flex items-center gap-3 rounded-xl border bg-card p-4"
              >
                <div className="rounded-lg bg-[#0f1e4a] p-2.5 text-[#F7C905]">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="flex-1 font-medium">{a.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="welc-card-glow lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{dict.owner.attendanceTrend}</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceTrend
              data={(trend as DailyAttendanceRow[] | null) ?? []}
            />
          </CardContent>
        </Card>

        <Card className="welc-card-glow">
          <CardHeader>
            <CardTitle className="text-base">{dict.owner.atRiskStudents}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {atRisk.length === 0 ? (
              <p className="text-sm text-muted-foreground">{dict.common.none}</p>
            ) : (
              atRisk.map((st) => (
                <div
                  key={st.student_id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate text-sm font-medium">
                    {st.full_name}
                  </span>
                  <Badge variant="warning">
                    {st.missed} {dict.owner.missed}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live activity — everything happening across the academy */}
      <Card className="welc-card-glow">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText className="h-4 w-4 text-[#0f1e4a]" />
            {dict.audit.title}
          </CardTitle>
          <Link
            href="/owner/audit"
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {dict.common.viewAll}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{dict.audit.empty}</p>
          ) : (
            recentRows.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {r.actor_id
                      ? actorNames.get(r.actor_id) ?? "—"
                      : dict.audit.system}
                    {r.actor_role && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {r.actor_role}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {actionLabel(r.action)}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDateTime(r.created_at)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
