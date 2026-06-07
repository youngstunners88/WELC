import { cn } from "@/lib/utils";

/**
 * WELC speech-bubble mark, rendered as inline SVG so it needs no binary asset.
 * Approximates the brand: a yellow speech bubble containing the "we(c" lettering.
 */
export function WelcMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 86"
      className={cn("h-10 w-auto", className)}
      role="img"
      aria-label="WELC"
    >
      <path
        d="M50 4C26 4 6 19 6 38c0 12 8 22 21 28-2 6-6 11-6 11s11-2 20-8c3 .6 6 .9 9 .9 24 0 44-15 44-32S74 4 50 4Z"
        fill="#F7E908"
      />
      <text
        x="50"
        y="46"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
        fontSize="34"
        fontWeight="700"
        fill="#1a1a1a"
      >
        we(c
      </text>
    </svg>
  );
}

export function WelcWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <WelcMark className="h-9" />
      <div className="leading-tight">
        <div className="text-base font-bold tracking-tight">WELC Academy</div>
        <div className="text-[11px] text-muted-foreground">
          위준성 영어 라이프 컨설팅
        </div>
      </div>
    </div>
  );
}
