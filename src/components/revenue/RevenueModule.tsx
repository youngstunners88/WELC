"use client";

import { Wallet, TrendingUp, Users, Eye, Power } from "lucide-react";
import { useRevenueModule } from "@/lib/revenue/useRevenueModule";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Dictionary } from "@/lib/i18n";

export interface TeacherHours {
  teacher_name: string;
  hours: number;
}

const won = (n: number) => "₩" + Math.round(n).toLocaleString("ko-KR");

// Illustrative figures shown in preview mode so the owner can see the feature
// without exposing real payroll.
const SAMPLE: TeacherHours[] = [
  { teacher_name: "김선생 (sample)", hours: 32 },
  { teacher_name: "이선생 (sample)", hours: 24 },
  { teacher_name: "박선생 (sample)", hours: 18 },
];

export function RevenueModule({
  teacherHours,
  activeStudents,
  dict,
}: {
  teacherHours: TeacherHours[];
  activeStudents: number;
  dict: Dictionary;
}) {
  const { prefs, update, loaded } = useRevenueModule();
  if (!loaded) return null;

  const live = prefs.enabled;
  const rows = live ? teacherHours : SAMPLE;
  const students = live ? activeStudents : 48;

  const payroll = rows.reduce((s, t) => s + t.hours * prefs.hourlyRate, 0);
  const revenue = students * prefs.tuitionPerStudent;
  const net = revenue - payroll;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Wallet className="h-6 w-6 text-[#0f1e4a]" />
            {dict.revenue.title}
            <Badge variant="warning">{dict.revenue.beta}</Badge>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {dict.revenue.subtitle}
          </p>
        </div>
        <Button
          variant={live ? "outline" : "default"}
          className="gap-2"
          onClick={() => update({ enabled: !live })}
        >
          {live ? (
            <>
              <Power className="h-4 w-4" />
              {dict.revenue.disable}
            </>
          ) : (
            <>
              <TrendingUp className="h-4 w-4" />
              {dict.revenue.enable}
            </>
          )}
        </Button>
      </div>

      {/* Mode banner */}
      <div
        className={
          live
            ? "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
            : "flex items-center gap-2 rounded-lg border border-[#F7C905]/40 bg-[#F7C905]/10 px-4 py-3 text-sm"
        }
      >
        {live ? (
          dict.revenue.enabledNote
        ) : (
          <>
            <Eye className="h-4 w-4 shrink-0" />
            {dict.revenue.previewNote}
          </>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="welc-card-glow border-t-4 border-t-rose-400">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {dict.revenue.totalPayroll}
            </p>
            <p className="mt-1 text-2xl font-bold text-rose-600">{won(payroll)}</p>
          </CardContent>
        </Card>
        <Card className="welc-card-glow border-t-4 border-t-emerald-500">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {dict.revenue.estRevenue}
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {won(revenue)}
            </p>
          </CardContent>
        </Card>
        <Card className="welc-card-glow border-t-4 border-t-[#0f1e4a]">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {dict.revenue.netEstimate}
            </p>
            <p className="mt-1 text-2xl font-bold text-[#0f1e4a]">{won(net)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Rate controls */}
      <Card className="welc-card-glow">
        <CardHeader>
          <CardTitle className="text-base">{dict.revenue.settings}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="rate">{dict.revenue.hourlyRate}</Label>
            <Input
              id="rate"
              type="number"
              min={0}
              step={1000}
              value={prefs.hourlyRate}
              onChange={(e) => update({ hourlyRate: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tuition">{dict.revenue.tuitionPerStudent}</Label>
            <Input
              id="tuition"
              type="number"
              min={0}
              step={10000}
              value={prefs.tuitionPerStudent}
              onChange={(e) =>
                update({ tuitionPerStudent: Number(e.target.value) })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Payroll table */}
      <Card className="welc-card-glow">
        <CardHeader>
          <CardTitle className="text-base">{dict.revenue.payrollTitle}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">{dict.revenue.teacher}</th>
                <th className="py-2 pr-4 font-medium">{dict.revenue.hours}</th>
                <th className="py-2 pr-4 font-medium">{dict.revenue.estPay}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-muted-foreground">
                    {dict.revenue.noData}
                  </td>
                </tr>
              ) : (
                rows.map((t) => (
                  <tr key={t.teacher_name} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{t.teacher_name}</td>
                    <td className="py-2 pr-4 tabular-nums">
                      {t.hours.toFixed(1)}
                    </td>
                    <td className="py-2 pr-4 tabular-nums">
                      {won(t.hours * prefs.hourlyRate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {dict.revenue.students}: {students} · {dict.revenue.disclaimer}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
