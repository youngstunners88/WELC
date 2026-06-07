import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CommitButton } from "@/components/classes/CommitButton";
import { formatDateTime } from "@/lib/datetime";
import type { Class, ClassSession, Commitment, Profile } from "@/types/database";

interface ClassWithSessions extends Class {
  teacher: Pick<Profile, "full_name"> | null;
  class_sessions: ClassSession[];
}

export default async function StudentClassesPage() {
  const supabase = await createClient();
  const dict = await getDictionary();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: classes } = await supabase
    .from("classes")
    .select(
      "*, teacher:profiles!classes_teacher_id_fkey(full_name), class_sessions(*)"
    )
    .order("start_date", { ascending: true });

  const { data: commitments } = await supabase
    .from("commitments")
    .select("id, session_id, status")
    .eq("student_id", user?.id ?? "")
    .neq("status", "uncommitted");

  const commitBySession = new Map<string, string>();
  for (const c of (commitments as Pick<
    Commitment,
    "id" | "session_id" | "status"
  >[] | null) ?? []) {
    commitBySession.set(c.session_id, c.id);
  }

  const rows = (classes as ClassWithSessions[] | null) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{dict.student.myClasses}</h1>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {dict.student.noClasses}
          </CardContent>
        </Card>
      ) : (
        rows.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{c.name}</CardTitle>
                <Badge variant="secondary">{c.level}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {dict.owner.teacher}: {c.teacher?.full_name ?? "—"}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {[...c.class_sessions]
                .sort((a, b) => a.session_number - b.session_number)
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="text-sm">
                      <span className="font-medium">#{s.session_number}</span>
                      <span className="ml-2 text-muted-foreground">
                        {formatDateTime(s.scheduled_at)}
                      </span>
                    </div>
                    {s.status === "scheduled" ? (
                      <CommitButton
                        sessionId={s.id}
                        scheduledAt={s.scheduled_at}
                        commitmentId={commitBySession.get(s.id) ?? null}
                        dict={dict}
                      />
                    ) : (
                      <Badge variant="outline">{s.status}</Badge>
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
