import { cn } from "@/lib/utils";

/**
 * Hand-crafted, on-brand decorative illustration for the auth brand panel.
 * Education + conversation theme: stacked books, a speech bubble, and a
 * graduation cap, in WELC navy/gold. Pure inline SVG — no binary asset,
 * crisp at any size.
 */
export function WelcIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 240"
      className={cn("h-auto w-full", className)}
      role="img"
      aria-label="WELC Academy — English learning"
      fill="none"
    >
      {/* soft ground shadow */}
      <ellipse cx="160" cy="208" rx="120" ry="14" fill="#000" opacity="0.12" />

      {/* stacked books */}
      <g>
        <rect x="78" y="176" width="164" height="22" rx="4" fill="#F7C905" />
        <rect x="78" y="176" width="164" height="22" rx="4" fill="#000" opacity="0.05" />
        <rect x="92" y="156" width="150" height="22" rx="4" fill="#ffffff" opacity="0.92" />
        <rect x="68" y="136" width="158" height="22" rx="4" fill="#F7C905" opacity="0.85" />
        {/* page lines */}
        <rect x="100" y="163" width="80" height="3" rx="1.5" fill="#0f1e4a" opacity="0.25" />
        <rect x="78" y="143" width="70" height="3" rx="1.5" fill="#0f1e4a" opacity="0.35" />
      </g>

      {/* speech bubble rising from the books */}
      <g>
        <path
          d="M150 56c-38 0-68 22-68 50 0 16 10 30 26 39-2 7-7 14-7 14s14-3 26-10c7 2 15 3 23 3 38 0 68-22 68-46S188 56 150 56Z"
          fill="#ffffff"
        />
        <text
          x="150"
          y="116"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontStyle="italic"
          fontSize="40"
          fontWeight="700"
          fill="#0f1e4a"
        >
          we(c
        </text>
      </g>

      {/* graduation cap floating top-right */}
      <g transform="translate(214 44) rotate(8)">
        <path d="M0 14 36 0 72 14 36 28Z" fill="#F7C905" />
        <path d="M14 21v16c0 6 10 11 22 11s22-5 22-11V21l-22 9-22-9Z" fill="#0f1e4a" />
        <circle cx="72" cy="14" r="3" fill="#0f1e4a" />
        <path d="M72 14v18" stroke="#0f1e4a" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="72" cy="34" r="4" fill="#F7C905" stroke="#0f1e4a" strokeWidth="2" />
      </g>

      {/* small sparkles */}
      <g fill="#F7C905">
        <path d="M58 70l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
        <path d="M256 150l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" opacity="0.8" />
      </g>
    </svg>
  );
}
