"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export function SessionTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState("00:00");

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => {
      const diff = Math.max(0, Date.now() - start);
      const m = Math.floor(diff / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setElapsed(
        `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-lg font-semibold tabular-nums">
      <Clock className="h-4 w-4" />
      {elapsed}
    </span>
  );
}
