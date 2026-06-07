"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyAttendanceRow } from "@/types/database";

export function AttendanceTrend({ data }: { data: DailyAttendanceRow[] }) {
  const chartData = data.map((d) => ({
    day: d.day.slice(5), // MM-DD
    rate: d.rate ?? 0,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        —
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={224}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="rateFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(160 84% 39%)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="hsl(160 84% 39%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
        <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} unit="%" />
        <Tooltip formatter={(v: number) => [`${v}%`, "Rate"]} />
        <Area
          type="monotone"
          dataKey="rate"
          stroke="hsl(160 84% 39%)"
          strokeWidth={2}
          fill="url(#rateFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
