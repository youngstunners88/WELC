import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/datetime";
import {
  AttendanceExport,
  type ExportRow,
} from "@/components/attendance/AttendanceExport";
import type { SessionAttendanceRow, SessionStatus } from "@/types/database";

const statusVariant: Record<
  SessionStatus,
  "default" | "secondary" | "success" | "warning" | "outline"
> = {
  scheduled: "outline",
  in_progress: "warning",
  completed: "success",
  cancelled: "secondary",
};

export default async function OwnerAttendancePage() {
  const supabase = await createClient();
  const dict = await getDictionary();

  const { data } = await supabase
    .from("v_session_attendance")
    .select("*")
    .order("scheduled_at", { ascending: false });

  const rows = (data as SessionAttendanceRow[] | null) ?? [];
  const noShow = (r: SessionAttendanceRow) =>
    Math.max(0, r.committed - r.present - r.late);

  const exportRows: ExportRow[] = rows.map((r) => ({
    class_name: r.class_name,
    session_number: r.session_number,
    scheduled_at: r.scheduled_at,
    status: r.status,
    committed: r.committed,
    present: r.present,
    late: r.late,
    missed: r.missed,
    no_show: noShow(r),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{dict.attendance.title}</h1>
          <p className="text-sm text-muted-foreground">
            {dict.attendance.subtitle}
          </p>
        </div>
        {rows.length > 0 && (
          <AttendanceExport rows={exportRows} label={dict.attendance.export} />
        )}
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {dict.attendance.none}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3 font-medium">{dict.attendance.class}</th>
                  <th className="p-3 font-medium">{dict.attendance.session}</th>
                  <th className="p-3 font-medium">{dict.attendance.when}</th>
                  <th className="p-3 font-medium">{dict.attendance.status}</th>
                  <th className="p-3 text-center font-medium">
                    {dict.attendance.committed}
                  </th>
                  <th className="p-3 text-center font-medium">
                    {dict.attendance.present}
                  </th>
                  <th className="p-3 text-center font-medium">
                    {dict.attendance.late}
                  </th>
                  <th className="p-3 text-center font-medium">
                    {dict.attendance.missed}
                  </th>
                  <th className="p-3 text-center font-medium">
                    {dict.attendance.noShow}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.session_id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{r.class_name}</td>
                    <td className="p-3 text-muted-foreground">
                      #{r.session_number}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatDateTime(r.scheduled_at)}
                    </td>
                    <td className="p-3">
                      <Badge variant={statusVariant[r.status]}>{r.status}</Badge>
                    </td>
                    <td className="p-3 text-center">{r.committed}</td>
                    <td className="p-3 text-center text-green-600">{r.present}</td>
                    <td className="p-3 text-center text-amber-600">{r.late}</td>
                    <td className="p-3 text-center text-red-600">{r.missed}</td>
                    <td className="p-3 text-center text-muted-foreground">
                      {noShow(r)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
