import { FileText, LinkIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CommitButton } from "@/components/classes/CommitButton";
import { formatDateTime } from "@/lib/datetime";
import { safeUrl } from "@/lib/safeUrl";
import type {
  Class,
  ClassSession,
  Commitment,
  Material,
  Profile,
} from "@/types/database";

interface ClassWithSessions extends Class {
  class_sessions: ClassSession[];
}

function publicUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/class-materials/${path}`;
}

export default async function StudentClassesPage() {
  const supabase = await createClient();
  const dict = await getDictionary();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Teacher names come from rpc_teacher_names, not a join on profiles: RLS
  // gives students no read access to teacher rows (by design — profiles
  // carries teacher email/phone), so the old embedded join silently returned
  // null and teacher names rendered blank.
  const { data: classes } = await supabase
    .from("classes")
    .select("*, class_sessions(*)")
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
  const ids = rows.map((c) => c.id);

  // Resolve teacher display names (id + full_name only — never contact details).
  const teacherIds = Array.from(
    new Set(rows.map((c) => c.teacher_id).filter(Boolean))
  ) as string[];
  const { data: teacherNames } = teacherIds.length
    ? await supabase.rpc("rpc_teacher_names", { p_ids: teacherIds })
    : { data: [] as { id: string; full_name: string }[] };
  const teacherNameById = new Map(
    ((teacherNames as { id: string; full_name: string }[] | null) ?? []).map(
      (t) => [t.id, t.full_name]
    )
  );

  const { data: materials } = ids.length
    ? await supabase
        .from("materials")
        .select("id, class_id, title, kind, storage_path, url")
        .in("class_id", ids)
        .order("created_at", { ascending: false })
    : { data: [] as Material[] };

  const materialsByClass = new Map<
    string,
    { id: string; title: string; kind: "file" | "link"; href: string }[]
  >();
  for (const m of (materials as Material[] | null) ?? []) {
    const href =
      m.kind === "file" ? publicUrl(m.storage_path ?? "") : m.url ?? "";
    materialsByClass.set(m.class_id, [
      ...(materialsByClass.get(m.class_id) ?? []),
      { id: m.id, title: m.title, kind: m.kind, href },
    ]);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{dict.student.myClasses}</h1>

      {rows.length === 0 ? (
        <Card className="welc-card-glow">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {dict.student.noClasses}
          </CardContent>
        </Card>
      ) : (
        rows.map((c) => (
          <Card key={c.id} className="welc-card-glow welc-card-hover">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{c.name}</CardTitle>
                <Badge variant="secondary">{c.level}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {dict.owner.teacher}:{" "}
                {teacherNameById.get(c.teacher_id ?? "") ?? "—"}
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

              {(materialsByClass.get(c.id)?.length ?? 0) > 0 && (
                <div className="mt-3 border-t pt-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {dict.materials.title}
                  </p>
                  <ul className="space-y-1.5">
                    {materialsByClass.get(c.id)!.map((m) => (
                      <li key={m.id}>
                        <a
                          href={safeUrl(m.href)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          {m.kind === "file" ? (
                            <FileText className="h-4 w-4 shrink-0" />
                          ) : (
                            <LinkIcon className="h-4 w-4 shrink-0" />
                          )}
                          <span className="truncate">{m.title}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
