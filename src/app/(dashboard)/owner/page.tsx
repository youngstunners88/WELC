import { BookOpen, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { AttendanceTrend } from "@/components/dashboard/AttendanceTrend";
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

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="space-y-8">
      {/* Welcome hero */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0f1e4a] px-8 py-7 text-white shadow-md">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-[0.08]"
          style={{ background: "#F7C905" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-10 right-20 h-28 w-28 rounded-full opacity-[0.06]"
          style={{ background: "#F7C905" }}
        />
        <p className="text-sm font-medium text-white/50">{today}</p>
        <h1 className="mt-1 text-2xl font-bold">
          {dict.nav.dashboard}
        </h1>
        <p className="mt-1 text-sm text-white/60">
          WELC Academy — 위준성 영어 라이프 컨설팅
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={dict.owner.activeClasses}
          value={s.active_classes}
          icon={BookOpen}
          color="navy"
        />
        <StatsCard
          title={dict.owner.teacherHours}
          value={s.total_hours}
          icon={Clock}
          color="yellow"
        />
        <StatsCard
          title={dict.owner.attendanceRate}
          value={`${s.attendance_rate}%`}
          icon={TrendingUp}
          color="green"
        />
        <StatsCard
          title={dict.owner.atRisk}
          value={s.at_risk_count}
          icon={AlertTriangle}
          color="red"
        />
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
    </div>
  );
}
