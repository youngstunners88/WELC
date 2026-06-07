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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{dict.nav.dashboard}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={dict.owner.activeClasses}
          value={s.active_classes}
          icon={BookOpen}
        />
        <StatsCard
          title={dict.owner.teacherHours}
          value={s.total_hours}
          icon={Clock}
        />
        <StatsCard
          title={dict.owner.attendanceRate}
          value={`${s.attendance_rate}%`}
          icon={TrendingUp}
        />
        <StatsCard
          title={dict.owner.atRisk}
          value={s.at_risk_count}
          icon={AlertTriangle}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{dict.owner.attendanceTrend}</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceTrend
              data={(trend as DailyAttendanceRow[] | null) ?? []}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{dict.owner.atRiskStudents}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {atRisk.length === 0 ? (
              <p className="text-sm text-muted-foreground">{dict.common.none}</p>
            ) : (
              atRisk.map((st) => (
                <div
                  key={st.student_id}
                  className="flex items-center justify-between"
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
