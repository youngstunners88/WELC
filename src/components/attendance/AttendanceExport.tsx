"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ExportRow {
  class_name: string;
  session_number: number;
  scheduled_at: string;
  status: string;
  committed: number;
  present: number;
  late: number;
  missed: number;
  no_show: number;
}

export function AttendanceExport({
  rows,
  label,
}: {
  rows: ExportRow[];
  label: string;
}) {
  function exportCsv() {
    const header = [
      "Class",
      "Session",
      "Scheduled",
      "Status",
      "Committed",
      "Present",
      "Late",
      "Missed",
      "No-show",
    ];
    const lines = rows.map((r) =>
      [
        `"${r.class_name.replace(/"/g, '""')}"`,
        r.session_number,
        r.scheduled_at,
        r.status,
        r.committed,
        r.present,
        r.late,
        r.missed,
        r.no_show,
      ].join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `welc-attendance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" className="gap-2" onClick={exportCsv}>
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
