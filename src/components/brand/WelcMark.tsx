import { cn } from "@/lib/utils";
import { WelcIllustration } from "@/components/brand/WelcIllustration";

/**
 * WELC speech-bubble mark — yellow bubble with italic "we(c" inside.
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
        fill="#F7C905"
      />
      <text
        x="50"
        y="46"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
        fontSize="34"
        fontWeight="700"
        fill="#0f1e4a"
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

/** Full-width hero panel for the auth split-screen layout (left side). */
export function WelcBrandPanel() {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden bg-[#0f1e4a] p-10 text-white">
      {/* Decorative speech-bubble shapes */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full opacity-[0.06]"
        style={{ background: "#F7C905" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-16 h-96 w-96 rounded-full opacity-[0.05]"
        style={{ background: "#F7C905" }}
      />

      <div className="relative z-10">
        <WelcMark className="h-14" />
        <p className="mt-2 text-lg font-bold tracking-tight text-white/90">
          WELC Academy
        </p>
        <p className="text-sm text-white/50">위준성 영어 라이프 컨설팅</p>
      </div>

      <div className="relative z-10 space-y-6">
        <WelcIllustration className="mx-auto max-w-[280px]" />

        <blockquote className="border-l-4 border-[#F7C905] pl-4">
          <p className="text-xl font-semibold leading-snug">
            &ldquo;WELC와 함께<br />영어를 생활화해 보아요!&rdquo;
          </p>
          <footer className="mt-2 text-sm text-white/60">— 위준성</footer>
        </blockquote>

        <ul className="space-y-3 text-sm text-white/70">
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F7C905]" />
            Class scheduling &amp; session tracking
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F7C905]" />
            Real-time attendance management
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F7C905]" />
            Teacher hours &amp; performance insights
          </li>
        </ul>
      </div>

      <p className="relative z-10 text-xs text-white/30">
        © {new Date().getFullYear()} WELC Academy · 사업자등록번호 107-88-20703
      </p>
    </div>
  );
}
