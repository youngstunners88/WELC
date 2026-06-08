import Link from "next/link";
import { Clock, FolderOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { StartClassButton } from "@/components/classes/StartClassButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/datetime";
import type { ClassSession, Class, TeacherHoursRow } from "@/types/database";

interface SessionRow extends ClassSession {
  classes: Pick<Class, "name" | "teacher_id"> | null;
}

export default async function TeacherHomePage() {
  const supabase = await createClient();
  const dict = await getDictionary();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user?.id ?? "")
    .single();

  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: sessions } = await supabase
    .from("class_sessions")
    .select("*, classes!inner(name, teacher_id)")
    .eq("classes.teacher_id", user?.id ?? "")
    .gte("scheduled_at", dayAgo)
    .lte("scheduled_at", in24h)
    .order("scheduled_at");

  const rows = (sessions as SessionRow[] | null) ?? [];

  const thisMonth = new Date().toISOString().slice(0, 7);
  const { data: hours } = await supabase
    .from("v_teacher_hours_monthly")
    .select("teacher_id, month, hours")
    .eq("teacher_id", user?.id ?? "");

  const monthHours = ((hours as TeacherHoursRow[] | null) ?? [])
    .filter((h) => String(h.month).slice(0, 7) === thisMonth)
    .reduce((sum, h) => sum + Number(h.hours), 0);

  const today = new Date().toLocaleDateString("ko-KR", {
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
        <p className="text-sm font-medium text-white/50">{today}</p>
        <h1 className="mt-1 text-2xl font-bold">
          안녕하세요, {(profile as { full_name?: string } | null)?.full_name?.split(" ")[0] ?? "선생님"} 선생님!
        </h1>
        <p className="mt-1 text-sm text-white/60">
          WELC Academy — 오늘도 좋은 수업 되세요 :)
        </p>
        <Button asChild variant="outline" size="sm" className="mt-4 border-white/20 bg-white/10 text-white hover:bg-white/20">
          <Link href="/teacher/classes">
            <FolderOpen className="mr-2 h-4 w-4" />
            {dict.materials.teacherTitle}
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:max-w-xs">
        <StatsCard
          title={dict.teacher.hoursThisMonth}
          value={monthHours.toFixed(1)}
          icon={Clock}
          color="yellow"
        />
      </div>

      {/* Today's sessions */}
      <Card className="welc-card-glow">
        <CardHeader>
          <CardTitle className="text-base">{dict.teacher.todaySessions}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {dict.teacher.noSessions}
            </p>
          ) : (
            rows.map((s) => (
              <div
                key={s.id}
                className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">{s.classes?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(s.scheduled_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {s.status === "scheduled" && (
                    <StartClassButton sessionId={s.id} dict={dict} />
                  )}
                  {s.status === "in_progress" && (
                    <>
                      <Badge variant="warning">in progress</Badge>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/teacher/attendance/${s.id}`}>
                          {dict.teacher.markAttendance}
                        </Link>
                      </Button>
                    </>
                  )}
                  {s.status === "completed" && (
                    <Badge variant="success">{s.actual_minutes} min</Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
