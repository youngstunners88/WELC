import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isAtRisk } from "@/lib/analytics";
import type { Profile, StudentAttendanceRow } from "@/types/database";

export default async function OwnerStudentsPage() {
  const supabase = await createClient();
  const dict = await getDictionary();

  const { data: students } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "student")
    .order("full_name");

  const { data: attendance } = await supabase
    .from("v_student_attendance")
    .select("*");

  const statsById = new Map<string, StudentAttendanceRow>();
  for (const a of (attendance as StudentAttendanceRow[] | null) ?? []) {
    statsById.set(a.student_id, a);
  }

  const rows = (students as Pick<Profile, "id" | "full_name" | "email">[]) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{dict.nav.students}</h1>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">{dict.nav.students}</th>
                <th className="px-5 py-3 font-medium">{dict.auth.email}</th>
                <th className="px-5 py-3 text-right font-medium">
                  {dict.owner.attendanceRate}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((st) => {
                const stat = statsById.get(st.id);
                const rate = stat?.attendance_rate;
                const risk = isAtRisk(stat?.missed ?? 0);
                return (
                  <tr key={st.id} className="border-b last:border-b-0">
                    <td className="px-5 py-3">
                      <span className="font-medium">{st.full_name}</span>
                      {risk && (
                        <Badge variant="warning" className="ml-2">
                          {dict.owner.atRisk}
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {st.email}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {rate != null ? `${rate}%` : "—"}
                    </td>
                  </tr>
                );
              })}
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
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
