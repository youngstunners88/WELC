import { cn } from "@/lib/utils";

/**
 * Subtle aviation motif for cabin-crew branding: a dashed great-circle flight
 * path with a small plane, plus soft clouds. Sits low-opacity behind hero
 * content on the navy panels. Decorative only.
 */
export function FlightMotif({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 200"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      fill="none"
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
    >
      {/* dashed flight path arc */}
      <path
        d="M-20 170 Q 160 20 420 120"
        stroke="#F7C905"
        strokeWidth="2"
        strokeDasharray="2 10"
        strokeLinecap="round"
        opacity="0.35"
      />
      {/* origin + destination dots */}
      <circle cx="40" cy="138" r="3.5" fill="#F7C905" opacity="0.6" />
      <circle cx="360" cy="103" r="3.5" fill="#F7C905" opacity="0.6" />

      {/* little plane riding the path */}
      <g transform="translate(232 60) rotate(28)" opacity="0.5">
        <path
          d="M0 6 L20 6 L28 0 L30 2 L26 8 L30 14 L28 16 L20 10 L0 10 Z"
          fill="#F7C905"
        />
      </g>

      {/* soft clouds */}
      <g fill="#ffffff" opacity="0.05">
        <ellipse cx="80" cy="60" rx="34" ry="14" />
        <ellipse cx="110" cy="66" rx="26" ry="12" />
        <ellipse cx="300" cy="150" rx="40" ry="16" />
        <ellipse cx="340" cy="156" rx="28" ry="12" />
      </g>
    </svg>
  );
}

/** Boarding-pass style perforation divider (horizontal). */
export function PerforationDivider({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex items-center", className)} aria-hidden>
      <div className="h-px flex-1 border-t border-dashed border-border" />
    </div>
  );
}
