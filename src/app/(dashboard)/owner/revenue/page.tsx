import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import {
  RevenueModule,
  type TeacherHours,
} from "@/components/revenue/RevenueModule";
import type { TeacherHoursRow } from "@/types/database";

export default async function OwnerRevenuePage() {
  const supabase = await createClient();
  const dict = await getDictionary();

  const thisMonth = new Date().toISOString().slice(0, 7);
  const { data: hours } = await supabase
    .from("v_teacher_hours_monthly")
    .select("teacher_name, month, hours");

  const byTeacher = new Map<string, number>();
  for (const h of (hours as TeacherHoursRow[] | null) ?? []) {
    if (String(h.month).slice(0, 7) !== thisMonth) continue;
    byTeacher.set(
      h.teacher_name,
      (byTeacher.get(h.teacher_name) ?? 0) + Number(h.hours)
    );
  }
  const teacherHours: TeacherHours[] = Array.from(byTeacher, ([n, h]) => ({
    teacher_name: n,
    hours: Math.round(h * 10) / 10,
  }));

  const { count: activeStudents } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "student");

  return (
    <RevenueModule
      teacherHours={teacherHours}
      activeStudents={activeStudents ?? 0}
      dict={dict}
    />
  );
}
