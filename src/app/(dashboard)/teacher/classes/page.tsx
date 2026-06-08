import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MaterialsManager,
  type MaterialItem,
} from "@/components/materials/MaterialsManager";
import type { Class, Material } from "@/types/database";

function publicUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/class-materials/${path}`;
}

export default async function TeacherClassesPage() {
  const supabase = await createClient();
  const dict = await getDictionary();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, level")
    .eq("teacher_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  const classList = (classes as Pick<Class, "id" | "name" | "level">[] | null) ?? [];
  const ids = classList.map((c) => c.id);

  const { data: materials } = ids.length
    ? await supabase
        .from("materials")
        .select("id, class_id, title, kind, storage_path, url")
        .in("class_id", ids)
        .order("created_at", { ascending: false })
    : { data: [] as Material[] };

  const byClass = new Map<string, MaterialItem[]>();
  for (const m of (materials as Material[] | null) ?? []) {
    const item: MaterialItem = {
      id: m.id,
      title: m.title,
      kind: m.kind,
      href: m.kind === "file" ? publicUrl(m.storage_path ?? "") : m.url ?? "",
    };
    byClass.set(m.class_id, [...(byClass.get(m.class_id) ?? []), item]);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{dict.materials.teacherTitle}</h1>

      {classList.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {dict.teacher.noSessions}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {classList.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  {c.name}
                  <Badge variant="secondary">{c.level}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MaterialsManager
                  classId={c.id}
                  items={byClass.get(c.id) ?? []}
                  dict={dict}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
