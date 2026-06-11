"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animated number that counts from 0 to its target on mount.
 * Falls back to a static value when prefers-reduced-motion is set.
 * Accepts "87" / "87%" / "12.5" style values; anything non-numeric
 * renders as-is.
 */
export function CountUp({
  value,
  duration = 900,
}: {
  value: string | number;
  duration?: number;
}) {
  const text = String(value);
  const match = text.match(/^(-?\d+(?:\.\d+)?)(.*)$/);
  const target = match ? parseFloat(match[1]) : null;
  const suffix = match ? match[2] : "";
  const decimals = match && match[1].includes(".") ? match[1].split(".")[1].length : 0;

  const [display, setDisplay] = useState(target === null ? text : "0" + suffix);
  const raf = useRef<number>();

  useEffect(() => {
    if (target === null) {
      setDisplay(text);
      return;
    }
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(text);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // easeOutCubic — same family as the entrance choreography
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay((target * eased).toFixed(decimals) + suffix);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return <span className="tabular-nums">{display}</span>;
}
