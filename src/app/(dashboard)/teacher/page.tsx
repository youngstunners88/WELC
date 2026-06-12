import Link from "next/link";
import { Clock, FolderOpen, Users, LineChart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { StartClassButton } from "@/components/classes/StartClassButton";
import { LogSessionButton } from "@/components/classes/LogSessionButton";
import { TeacherReferralCard } from "@/components/teacher/TeacherReferralCard";
import { KakaoShareButton } from "@/components/kakao/KakaoShareButton";
import { FlightMotif } from "@/components/brand/FlightMotif";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/datetime";
import type {
  ClassSession,
  Class,
  TeacherHoursRow,
  TeacherStudentRow,
  TeacherDigestRow,
} from "@/types/database";

interface SessionRow extends ClassSession {
  classes: Pick<Class, "name" | "teacher_id" | "duration_minutes"> | null;
}

export default async function TeacherHomePage() {
  const supabase = await createClient();
  const dict = await getDictionary();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user?.id ?? "";

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", uid)
    .single();

  const nowIso = new Date().toISOString();
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Upcoming / in-progress sessions (today view)
  const { data: sessions } = await supabase
    .from("class_sessions")
    .select("*, classes!inner(name, teacher_id, duration_minutes)")
    .eq("classes.teacher_id", uid)
    .gte("scheduled_at", dayAgo)
    .lte("scheduled_at", in24h)
    .order("scheduled_at");
  const rows = (sessions as SessionRow[] | null) ?? [];

  // Past sessions that were never run/logged → still 'scheduled' in the past.
  const { data: pastSessions } = await supabase
    .from("class_sessions")
    .select("*, classes!inner(name, teacher_id, duration_minutes)")
    .eq("classes.teacher_id", uid)
    .eq("status", "scheduled")
    .lt("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: false })
    .limit(20);
  const unlogged = (pastSessions as SessionRow[] | null) ?? [];

  // Teaching hours this month
  const thisMonth = new Date().toISOString().slice(0, 7);
  const { data: hours } = await supabase
    .from("v_teacher_hours_monthly")
    .select("teacher_id, month, hours")
    .eq("teacher_id", uid);
  const monthHours = ((hours as TeacherHoursRow[] | null) ?? [])
    .filter((h) => String(h.month).slice(0, 7) === thisMonth)
    .reduce((sum, h) => sum + Number(h.hours), 0);

  // Students who joined via this teacher's referral link (view may not exist
  // until the 20260607 migration is applied — fall back to empty).
  const { data: myStudents } = await supabase
    .from("v_teacher_students")
    .select("*")
    .eq("teacher_id", uid)
    .order("joined_at", { ascending: false });
  const students = (myStudents as TeacherStudentRow[] | null) ?? [];

  // This month's digest (self). RPC returns just this teacher's row; degrades
  // to null until the 20260610 migration is applied.
  const { data: digestData } = await supabase.rpc("rpc_teacher_digests", {
    p_month: new Date().toISOString().slice(0, 10),
  });
  const myDigest =
    ((digestData as TeacherDigestRow[] | null) ?? []).find(
      (r) => r.teacher_id === uid
    ) ?? null;

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://welc-academy.vercel.app";
  const referralLink = `${appUrl}/login?ref=${uid}`;

  const today = new Date().toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const firstName =
    (profile as { full_name?: string } | null)?.full_name?.split(" ")[0] ??
    "선생님";

  return (
    <div className="space-y-8">
      {/* Welcome hero */}
      <div className="welc-sky welc-glint welc-rise relative overflow-hidden rounded-2xl px-8 py-7 text-white shadow-md">
        <FlightMotif />
        <div className="relative z-10">
        <p className="text-sm font-medium text-white/50">{today}</p>
        <h1 className="mt-1 text-2xl font-bold">
          안녕하세요, {firstName} 선생님!
        </h1>
        <p className="mt-1 text-sm text-white/60">
          WELC Academy — 오늘도 좋은 수업 되세요 :)
        </p>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="mt-4 border-white/20 bg-white/10 text-white hover:bg-white/20"
        >
          <Link href="/teacher/classes">
            <FolderOpen className="mr-2 h-4 w-4" />
            {dict.materials.teacherTitle}
          </Link>
        </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-md">
        <StatsCard
          title={dict.teacher.hoursThisMonth}
          value={monthHours.toFixed(1)}
          icon={Clock}
          color="yellow"
          stagger={1}
        />
        <StatsCard
          title={dict.referral.myStudents}
          value={students.length}
          icon={Users}
          color="navy"
          stagger={2}
        />
      </div>

      {/* This month's digest (self) */}
      {myDigest && (
        <Card className="welc-card-glow welc-rise">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChart className="h-4 w-4 text-[#0f1e4a]" />
              {dict.digests.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-lg font-bold tabular-nums text-[#0f1e4a]">
                  {Number(myDigest.hours).toFixed(1)}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {dict.digests.hours}
                </p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-lg font-bold tabular-nums text-[#0f1e4a]">
                  {myDigest.attendance_rate ?? 0}%
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {dict.digests.attendance}
                </p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-lg font-bold tabular-nums text-[#0f1e4a]">
                  {myDigest.at_risk}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {dict.digests.atRisk}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referral link */}
      <TeacherReferralCard link={referralLink} dict={dict} />

      {/* Past classes to log */}
      {unlogged.length > 0 && (
        <Card className="welc-card-glow border-t-4 border-t-emerald-500">
          <CardHeader>
            <CardTitle className="text-base">{dict.log.logPast}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {unlogged.map((s) => (
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
                  <Badge variant="outline">{dict.log.pastBadge}</Badge>
                  <LogSessionButton
                    sessionId={s.id}
                    defaultMinutes={s.classes?.duration_minutes ?? 60}
                    dict={dict}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Today's sessions */}
      <Card className="welc-card-glow">
        <CardHeader>
          <CardTitle className="text-base">
            {dict.teacher.todaySessions}
          </CardTitle>
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
                <div className="flex flex-wrap items-center gap-2">
                  <KakaoShareButton
                    text={`[WELC Academy] ${s.classes?.name ?? ""} — ${formatDateTime(s.scheduled_at)}`}
                    url={appUrl}
                    label={dict.kakao.share}
                    copiedLabel={dict.kakao.copied}
                  />
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

      {/* My students (via referral) */}
      <Card className="welc-card-glow">
        <CardHeader>
          <CardTitle className="text-base">
            {dict.referral.myStudents}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {dict.referral.noStudents}
            </p>
          ) : (
            students.map((st) => (
              <div
                key={st.student_id}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {st.student_name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {dict.referral.joined}: {formatDateTime(st.joined_at)}
                  </p>
                </div>
                {st.total > 0 && (
                  <Badge variant="secondary">
                    {st.attendance_rate ?? 0}% · {st.attended}/{st.total}
                  </Badge>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
