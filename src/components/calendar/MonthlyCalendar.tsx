"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n";

export interface CalendarEvent {
  id: string;
  date: string; // ISO
  title: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
}

const statusDot: Record<CalendarEvent["status"], string> = {
  scheduled: "bg-blue-500",
  in_progress: "bg-emerald-500",
  completed: "bg-gray-400",
  cancelled: "bg-rose-400",
};

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function MonthlyCalendar({
  events,
  dict,
  locale,
}: {
  events: CalendarEvent[];
  dict: Dictionary;
  locale: "ko" | "en";
}) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string>(() => ymd(new Date()));

  const byDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = ymd(new Date(e.date));
      m.set(key, [...(m.get(key) ?? []), e]);
    }
    return m;
  }, [events]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = ymd(new Date());

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const weekdays =
    locale === "ko"
      ? ["일", "월", "화", "수", "목", "금", "토"]
      : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const monthLabel = cursor.toLocaleDateString(
    locale === "ko" ? "ko-KR" : "en-US",
    { year: "numeric", month: "long" }
  );

  const selectedEvents = (byDay.get(selected) ?? []).sort(
    (a, b) => +new Date(a.date) - +new Date(b.date)
  );

  return (
    <div className="space-y-4">
      <Card className="welc-card-glow">
        <CardContent className="p-4">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">{monthLabel}</h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                aria-label="prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const n = new Date();
                  setCursor(new Date(n.getFullYear(), n.getMonth(), 1));
                  setSelected(ymd(n));
                }}
              >
                {dict.calendar.today}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                aria-label="next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {weekdays.map((w, i) => (
              <div
                key={w}
                className={cn("py-1", i === 0 && "text-rose-500")}
              >
                {w}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} />;
              const key = ymd(d);
              const evs = byDay.get(key) ?? [];
              const isToday = key === todayKey;
              const isSel = key === selected;
              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-start rounded-lg p-1 text-sm transition-colors",
                    isSel
                      ? "bg-[#0f1e4a] text-white"
                      : "hover:bg-muted",
                    isToday && !isSel && "ring-1 ring-[#F7C905]"
                  )}
                >
                  <span className={cn(d.getDay() === 0 && !isSel && "text-rose-500")}>
                    {d.getDate()}
                  </span>
                  {evs.length > 0 && (
                    <span className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                      {evs.slice(0, 3).map((e) => (
                        <span
                          key={e.id}
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            isSel ? "bg-[#F7C905]" : statusDot[e.status]
                          )}
                        />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected day detail */}
      <Card className="welc-card-glow">
        <CardContent className="space-y-2 p-4">
          <p className="text-sm font-semibold">
            {new Date(selected).toLocaleDateString(
              locale === "ko" ? "ko-KR" : "en-US",
              { month: "long", day: "numeric", weekday: "long" }
            )}
          </p>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {dict.calendar.noEvents}
            </p>
          ) : (
            selectedEvents.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn("h-2.5 w-2.5 rounded-full", statusDot[e.status])}
                  />
                  <span className="text-sm font-medium">{e.title}</span>
                </div>
                <Badge variant="outline">
                  {new Date(e.date).toLocaleTimeString(
                    locale === "ko" ? "ko-KR" : "en-US",
                    { hour: "2-digit", minute: "2-digit" }
                  )}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
