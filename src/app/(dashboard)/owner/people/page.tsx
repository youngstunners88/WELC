import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserRoleActions } from "@/components/people/UserRoleActions";
import type {
  Profile,
  StudentAttendanceRow,
  TeacherHoursRow,
} from "@/types/database";
import type { Role } from "@/lib/constants";

export default async function OwnerPeoplePage() {
  const supabase = await createClient();
  const dict = await getDictionary();

  const { data: people } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, requested_role, status")
    .order("status", { ascending: false }) // pending first
    .order("role")
    .order("full_name");

  const { data: studentRows } = await supabase
    .from("v_student_attendance")
    .select("student_id, attendance_rate");
  const { data: hourRows } = await supabase
    .from("v_teacher_hours_monthly")
    .select("teacher_id, month, hours");

  const all = (people as Pick<
    Profile,
    "id" | "full_name" | "email" | "role" | "requested_role" | "status"
  >[] | null) ?? [];

  const rateByStudent = new Map<string, number | null>(
    ((studentRows as StudentAttendanceRow[] | null) ?? []).map((r) => [
      r.student_id,
      r.attendance_rate,
    ])
  );
  const thisMonth = new Date().toISOString().slice(0, 7);
  const hoursByTeacher = new Map<string, number>();
  for (const h of (hourRows as TeacherHoursRow[] | null) ?? []) {
    if (String(h.month).slice(0, 7) !== thisMonth) continue;
    hoursByTeacher.set(
      h.teacher_id,
      (hoursByTeacher.get(h.teacher_id) ?? 0) + Number(h.hours)
    );
  }

  const pending = all.filter((p) => p.status === "pending");

  function detail(p: (typeof all)[number]): string {
    if (p.role === "teacher")
      return `${(hoursByTeacher.get(p.id) ?? 0).toFixed(1)} ${dict.manage.hoursThisMonth}`;
    if (p.role === "student") {
      const r = rateByStudent.get(p.id);
      return r == null ? "—" : `${Math.round(r * 100)}% ${dict.manage.attendanceRate}`;
    }
    return "—";
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{dict.manage.title}</h1>

      {/* Pending teacher requests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {dict.manage.pendingTeachers}
            {pending.length > 0 && (
              <Badge variant="warning" className="ml-2">
                {pending.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">{dict.manage.noPending}</p>
          ) : (
            <ul className="divide-y">
              {pending.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{p.full_name}</p>
                    <p className="text-sm text-muted-foreground">{p.email}</p>
                  </div>
                  <UserRoleActions
                    userId={p.id}
                    role={p.role as Role}
                    pending
                    dict={dict}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* All users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dict.manage.allUsers}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">{dict.manage.name}</th>
                <th className="py-2 pr-4 font-medium">{dict.manage.email}</th>
                <th className="py-2 pr-4 font-medium">{dict.manage.role}</th>
                <th className="py-2 pr-4 font-medium">{dict.manage.detail}</th>
                <th className="py-2 pr-4 font-medium">{dict.manage.actions}</th>
              </tr>
            </thead>
            <tbody>
              {all.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{p.full_name}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{p.email}</td>
                  <td className="py-2 pr-4">
                    <Badge
                      variant={
                        p.role === "owner"
                          ? "default"
                          : p.role === "teacher"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {dict.roles[p.role as Role]}
                    </Badge>
                    {p.status === "pending" && (
                      <Badge variant="warning" className="ml-1">
                        {dict.manage.pending}
                      </Badge>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">{detail(p)}</td>
                  <td className="py-2 pr-4">
                    <UserRoleActions
                      userId={p.id}
                      role={p.role as Role}
                      pending={p.status === "pending"}
                      dict={dict}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
