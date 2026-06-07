import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { TrendingUp } from "lucide-react";
import { formatDateTime } from "@/lib/datetime";
import type {
  Attendance,
  ClassSession,
  Class,
  AttendanceMark,
} from "@/types/database";

interface HistoryRow extends Pick<Attendance, "id" | "mark" | "created_at"> {
  class_sessions:
    | (Pick<ClassSession, "scheduled_at"> & {
        classes: Pick<Class, "name"> | null;
      })
    | null;
}

const markVariant: Record<AttendanceMark, "success" | "warning" | "destructive"> =
  {
    present: "success",
    late: "warning",
    missed: "destructive",
  };

export default async function StudentHistoryPage() {
  const supabase = await createClient();
  const dict = await getDictionary();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: history } = await supabase
    .from("attendance")
    .select(
      "id, mark, created_at, class_sessions(scheduled_at, classes(name))"
    )
    .eq("student_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  const rows = (history as HistoryRow[] | null) ?? [];
  const attended = rows.filter((r) => r.mark !== "missed").length;
  const rate =
    rows.length > 0 ? Math.round((attended / rows.length) * 1000) / 10 : null;

  const markLabel: Record<AttendanceMark, string> = {
    present: dict.teacher.markPresent,
    late: dict.teacher.markLate,
    missed: dict.teacher.markMissed,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{dict.student.history}</h1>

      <div className="grid grid-cols-1 gap-4 sm:max-w-xs">
        <StatsCard
          title={dict.student.rate}
          value={rate != null ? `${rate}%` : "—"}
          icon={TrendingUp}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {dict.student.noHistory}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">{dict.student.class}</th>
                  <th className="px-5 py-3 font-medium">{dict.student.date}</th>
                  <th className="px-5 py-3 text-right font-medium">
                    {dict.student.result}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0">
                    <td className="px-5 py-3 font-medium">
                      {r.class_sessions?.classes?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {r.class_sessions?.scheduled_at
                        ? formatDateTime(r.class_sessions.scheduled_at)
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Badge variant={markVariant[r.mark]}>
                        {markLabel[r.mark]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
