import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SessionTimer } from "@/components/classes/SessionTimer";
import {
  AttendanceMarker,
  type AttendanceStudent,
} from "@/components/attendance/AttendanceMarker";
import { formatDateTime } from "@/lib/datetime";
import { safeUrl } from "@/lib/safeUrl";
import type {
  ClassSession,
  Class,
  Commitment,
  Attendance,
  Profile,
  AttendanceMark,
} from "@/types/database";

interface SessionDetail extends ClassSession {
  classes: Pick<Class, "name" | "meeting_link" | "teacher_id"> | null;
}

interface CommitmentRow extends Pick<Commitment, "student_id"> {
  profiles: Pick<Profile, "full_name"> | null;
}

export default async function AttendancePage({
  params,
}: {
  params: { sessionId: string };
}) {
  const supabase = await createClient();
  const dict = await getDictionary();
  const { sessionId } = params;

  const { data: session } = await supabase
    .from("class_sessions")
    .select("*, classes!inner(name, meeting_link, teacher_id)")
    .eq("id", sessionId)
    .single<SessionDetail>();

  if (!session) notFound();

  const { data: commitments } = await supabase
    .from("commitments")
    .select("student_id, profiles!commitments_student_id_fkey(full_name)")
    .eq("session_id", sessionId)
    .in("status", ["committed", "attended"]);

  const { data: marks } = await supabase
    .from("attendance")
    .select("student_id, mark")
    .eq("session_id", sessionId);

  const markByStudent = new Map<string, AttendanceMark>();
  for (const m of (marks as Pick<Attendance, "student_id" | "mark">[] | null) ??
    []) {
    markByStudent.set(m.student_id, m.mark);
  }

  const students: AttendanceStudent[] = (
    (commitments as CommitmentRow[] | null) ?? []
  ).map((c) => ({
    studentId: c.student_id,
    fullName: c.profiles?.full_name ?? "—",
    mark: markByStudent.get(c.student_id) ?? null,
  }));

  const link = safeUrl(session.classes?.meeting_link);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/teacher">← {dict.common.back}</Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>{session.classes?.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDateTime(session.scheduled_at)}
              </p>
            </div>
            {session.status === "in_progress" && session.started_at && (
              <SessionTimer startedAt={session.started_at} />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {link && (
            <Button asChild variant="outline" className="gap-2">
              <a href={link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                {dict.owner.meetingLink}
              </a>
            </Button>
          )}

          <div>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
              {dict.teacher.committedStudents}
            </h2>
            <AttendanceMarker
              sessionId={sessionId}
              students={students}
              canEnd={session.status === "in_progress"}
              dict={dict}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
