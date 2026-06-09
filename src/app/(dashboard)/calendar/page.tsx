import { createClient } from "@/lib/supabase/server";
import { getDictionary, getLocale } from "@/lib/i18n";
import {
  MonthlyCalendar,
  type CalendarEvent,
} from "@/components/calendar/MonthlyCalendar";
import type { Class, ClassSession } from "@/types/database";
import type { Role } from "@/lib/constants";

interface Row extends Pick<ClassSession, "id" | "scheduled_at" | "status"> {
  classes: (Pick<Class, "name" | "teacher_id">) | null;
}

export default async function CalendarPage() {
  const supabase = await createClient();
  const dict = await getDictionary();
  const locale = await getLocale();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single<{ role: Role }>();
  const role = profile?.role ?? "student";

  // Window: previous month start → +3 months.
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();

  let query = supabase
    .from("class_sessions")
    .select("id, scheduled_at, status, classes!inner(name, teacher_id)")
    .gte("scheduled_at", from)
    .lte("scheduled_at", to)
    .order("scheduled_at");

  // Teachers see only their own classes; owners and students see all.
  if (role === "teacher") {
    query = query.eq("classes.teacher_id", user?.id ?? "");
  }

  const { data } = await query;
  const events: CalendarEvent[] = ((data as Row[] | null) ?? []).map((r) => ({
    id: r.id,
    date: r.scheduled_at,
    title: r.classes?.name ?? "—",
    status: r.status as CalendarEvent["status"],
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{dict.calendar.title}</h1>
      <MonthlyCalendar events={events} dict={dict} locale={locale} />
    </div>
  );
}
