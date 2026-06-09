"use client";

import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { useRevenueModule } from "@/lib/revenue/useRevenueModule";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { WelcMark } from "@/components/brand/WelcMark";
import type { Dictionary } from "@/lib/i18n";

export interface HoursRow {
  teacher_name: string;
  month: string; // YYYY-MM-DD (first of month)
  hours: number;
  sessions: number;
}

const won = (n: number) => "₩" + Math.round(n).toLocaleString("ko-KR");

export function PayrollReport({
  rows,
  dict,
  locale,
}: {
  rows: HoursRow[];
  dict: Dictionary;
  locale: "ko" | "en";
}) {
  const { prefs } = useRevenueModule();
  const rate = prefs.hourlyRate || 30000;

  const months = useMemo(() => {
    const set = new Set(rows.map((r) => String(r.month).slice(0, 7)));
    const arr = Array.from(set).sort().reverse();
    if (arr.length === 0) arr.push(new Date().toISOString().slice(0, 7));
    return arr;
  }, [rows]);

  const [month, setMonth] = useState(months[0]);

  const byTeacher = useMemo(() => {
    const m = new Map<string, { hours: number; sessions: number }>();
    for (const r of rows) {
      if (String(r.month).slice(0, 7) !== month) continue;
      const cur = m.get(r.teacher_name) ?? { hours: 0, sessions: 0 };
      cur.hours += Number(r.hours);
      cur.sessions += Number(r.sessions);
      m.set(r.teacher_name, cur);
    }
    return Array.from(m, ([teacher_name, v]) => ({
      teacher_name,
      hours: Math.round(v.hours * 10) / 10,
      sessions: v.sessions,
      pay: v.hours * rate,
    })).sort((a, b) => b.hours - a.hours);
  }, [rows, month, rate]);

  const totals = byTeacher.reduce(
    (acc, t) => ({
      hours: acc.hours + t.hours,
      sessions: acc.sessions + t.sessions,
      pay: acc.pay + t.pay,
    }),
    { hours: 0, sessions: 0, pay: 0 }
  );

  const monthLabel = new Date(month + "-01").toLocaleDateString(
    locale === "ko" ? "ko-KR" : "en-US",
    { year: "numeric", month: "long" }
  );
  const generated = new Date().toLocaleDateString(
    locale === "ko" ? "ko-KR" : "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  return (
    <div className="space-y-5">
      {/* Controls — hidden when printing */}
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{dict.reports.month}</label>
          <Select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-48"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {new Date(m + "-01").toLocaleDateString(
                  locale === "ko" ? "ko-KR" : "en-US",
                  { year: "numeric", month: "long" }
                )}
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          {dict.reports.savePdf}
        </Button>
      </div>

      {/* Printable document */}
      <Card className="welc-card-glow print:border-0 print:shadow-none">
        <CardContent className="p-8 print:p-0">
          {/* Letterhead */}
          <div className="flex items-start justify-between border-b-2 border-[#0f1e4a] pb-4">
            <div className="flex items-center gap-3">
              <WelcMark className="h-12" />
              <div>
                <p className="text-lg font-bold">WELC Academy</p>
                <p className="text-xs text-muted-foreground">
                  위준성 영어 라이프 컨설팅 · 사업자등록번호 107-88-20703
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold uppercase tracking-wide text-[#0f1e4a]">
                {dict.reports.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {dict.reports.generated}: {generated}
              </p>
            </div>
          </div>

          <h2 className="mt-5 text-xl font-bold">{monthLabel}</h2>

          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4 font-semibold">
                  {dict.reports.teacher}
                </th>
                <th className="py-2 pr-4 text-right font-semibold">
                  {dict.reports.sessions}
                </th>
                <th className="py-2 pr-4 text-right font-semibold">
                  {dict.reports.hours}
                </th>
                <th className="py-2 text-right font-semibold">
                  {dict.reports.pay}
                </th>
              </tr>
            </thead>
            <tbody>
              {byTeacher.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {dict.reports.noData}
                  </td>
                </tr>
              ) : (
                byTeacher.map((t) => (
                  <tr key={t.teacher_name} className="border-b">
                    <td className="py-2 pr-4 font-medium">{t.teacher_name}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {t.sessions}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {t.hours.toFixed(1)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {won(t.pay)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {byTeacher.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-[#0f1e4a] font-bold">
                  <td className="py-2 pr-4">{dict.reports.total}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {totals.sessions}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {totals.hours.toFixed(1)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {won(totals.pay)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>

          <p className="mt-3 text-xs text-muted-foreground">
            {dict.reports.rateNote}: {won(rate)} / {dict.reports.hour}
          </p>

          {/* Signature */}
          <div className="mt-12 flex justify-end gap-12 text-sm">
            <div className="text-center">
              <div className="h-10 w-48 border-b border-dashed border-muted-foreground" />
              <p className="mt-1 text-xs text-muted-foreground">
                {dict.reports.approvedBy}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
