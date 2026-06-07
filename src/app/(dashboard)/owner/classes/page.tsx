import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { CreateClassDialog } from "@/components/classes/CreateClassDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/datetime";
import type { Class, ClassSession, Profile } from "@/types/database";

interface ClassRow extends Class {
  teacher: Pick<Profile, "full_name"> | null;
  class_sessions: Pick<ClassSession, "id" | "scheduled_at">[];
}

export default async function OwnerClassesPage() {
  const supabase = await createClient();
  const dict = await getDictionary();

  const { data: teachers } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "teacher")
    .order("full_name");

  const { data: classes } = await supabase
    .from("classes")
    .select(
      "*, teacher:profiles!classes_teacher_id_fkey(full_name), class_sessions(id, scheduled_at)"
    )
    .order("created_at", { ascending: false });

  const rows = (classes as ClassRow[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{dict.nav.classes}</h1>
        <CreateClassDialog
          teachers={(teachers as Pick<Profile, "id" | "full_name">[]) ?? []}
          dict={dict}
        />
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {dict.owner.noClasses}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rows.map((c) => {
            const next = [...c.class_sessions]
              .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
              .find((s) => new Date(s.scheduled_at) >= new Date());
            return (
              <Card key={c.id}>
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{c.name}</h3>
                    <Badge variant="secondary">{c.level}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {dict.owner.teacher}: {c.teacher?.full_name ?? "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {dict.owner.nextSession}:{" "}
                    {next ? formatDateTime(next.scheduled_at) : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.class_sessions.length} {dict.nav.sessions}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
