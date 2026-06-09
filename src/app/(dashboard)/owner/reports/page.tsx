import { createClient } from "@/lib/supabase/server";
import { getDictionary, getLocale } from "@/lib/i18n";
import { PayrollReport, type HoursRow } from "@/components/reports/PayrollReport";
import type { TeacherHoursRow } from "@/types/database";

export default async function OwnerReportsPage() {
  const supabase = await createClient();
  const dict = await getDictionary();
  const locale = await getLocale();

  const { data } = await supabase
    .from("v_teacher_hours_monthly")
    .select("teacher_name, month, hours, sessions");

  const rows: HoursRow[] = ((data as TeacherHoursRow[] | null) ?? []).map(
    (r) => ({
      teacher_name: r.teacher_name,
      month: String(r.month),
      hours: Number(r.hours),
      sessions: Number(r.sessions),
    })
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{dict.reports.title}</h1>
      <PayrollReport rows={rows} dict={dict} locale={locale} />
    </div>
  );
}
