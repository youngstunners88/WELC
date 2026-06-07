import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import type { Profile, TeacherHoursRow } from "@/types/database";

export default async function OwnerTeachersPage() {
  const supabase = await createClient();
  const dict = await getDictionary();

  const { data: teachers } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "teacher")
    .order("full_name");

  const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const { data: hours } = await supabase
    .from("v_teacher_hours_monthly")
    .select("teacher_id, month, hours");

  const hoursByTeacher = new Map<string, number>();
  for (const h of (hours as TeacherHoursRow[] | null) ?? []) {
    if (String(h.month).slice(0, 7) === thisMonth) {
      hoursByTeacher.set(
        h.teacher_id,
        (hoursByTeacher.get(h.teacher_id) ?? 0) + Number(h.hours)
      );
    }
  }

  const rows = (teachers as Pick<Profile, "id" | "full_name" | "email">[]) ?? [];
  const total = rows.reduce(
    (sum, t) => sum + (hoursByTeacher.get(t.id) ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{dict.nav.teachers}</h1>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">{dict.owner.teacher}</th>
                <th className="px-5 py-3 font-medium">{dict.auth.email}</th>
                <th className="px-5 py-3 text-right font-medium">
                  {dict.owner.hoursThisMonth}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b last:border-b-0">
                  <td className="px-5 py-3 font-medium">{t.full_name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{t.email}</td>
                  <td className="px-5 py-3 text-right">
                    {(hoursByTeacher.get(t.id) ?? 0).toFixed(1)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-5 py-8 text-center text-muted-foreground"
                  >
                    {dict.common.none}
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="border-t font-semibold">
                <tr>
                  <td className="px-5 py-3" colSpan={2}>
                    {dict.common.total}
                  </td>
                  <td className="px-5 py-3 text-right">{total.toFixed(1)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
