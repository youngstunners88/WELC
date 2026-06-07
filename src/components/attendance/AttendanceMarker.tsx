"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Square } from "lucide-react";
import {
  markAttendance,
  endSession,
} from "@/app/(dashboard)/teacher/attendance/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n";
import type { AttendanceMark } from "@/types/database";

export interface AttendanceStudent {
  studentId: string;
  fullName: string;
  mark: AttendanceMark | null;
}

const MARKS: AttendanceMark[] = ["present", "late", "missed"];

export function AttendanceMarker({
  sessionId,
  students,
  canEnd,
  dict,
}: {
  sessionId: string;
  students: AttendanceStudent[];
  canEnd: boolean;
  dict: Dictionary;
}) {
  const [marks, setMarks] = useState<Record<string, AttendanceMark | null>>(
    Object.fromEntries(students.map((s) => [s.studentId, s.mark]))
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isEnding, startEnding] = useTransition();
  const router = useRouter();

  async function setMark(studentId: string, mark: AttendanceMark) {
    const previous = marks[studentId] ?? null;
    setMarks((m) => ({ ...m, [studentId]: mark })); // optimistic
    setPendingId(studentId);
    const result = await markAttendance(sessionId, studentId, mark);
    setPendingId(null);
    if (result?.error) {
      setMarks((m) => ({ ...m, [studentId]: previous }));
      toast.error(result.error);
    }
  }

  function onEnd() {
    startEnding(async () => {
      const result = await endSession(sessionId);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(dict.teacher.endClass);
        router.push("/teacher");
      }
    });
  }

  const labels: Record<AttendanceMark, string> = {
    present: dict.teacher.markPresent,
    late: dict.teacher.markLate,
    missed: dict.teacher.markMissed,
  };

  return (
    <div className="space-y-4">
      <ul className="divide-y rounded-lg border">
        {students.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            {dict.common.none}
          </li>
        )}
        {students.map((s) => (
          <li
            key={s.studentId}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="font-medium">{s.fullName}</span>
            <div className="flex gap-2">
              {MARKS.map((mark) => {
                const active = marks[s.studentId] === mark;
                return (
                  <button
                    key={mark}
                    type="button"
                    disabled={pendingId === s.studentId}
                    onClick={() => setMark(s.studentId, mark)}
                    className={cn(
                      "min-h-11 rounded-md border px-3 text-sm font-medium transition-colors disabled:opacity-50",
                      active && mark === "present" && "bg-emerald-600 text-white",
                      active && mark === "late" && "bg-amber-500 text-white",
                      active && mark === "missed" && "bg-destructive text-white",
                      !active && "hover:bg-accent"
                    )}
                  >
                    {labels[mark]}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      {canEnd && (
        <Button
          onClick={onEnd}
          disabled={isEnding}
          variant="destructive"
          className="gap-2"
        >
          <Square className="h-4 w-4" />
          {dict.teacher.endClass}
        </Button>
      )}
    </div>
  );
}
