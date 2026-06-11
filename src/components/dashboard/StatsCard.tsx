import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CountUp } from "@/components/dashboard/CountUp";
import { cn } from "@/lib/utils";

type ColorVariant = "navy" | "yellow" | "green" | "red" | "purple";

const variantStyles: Record<
  ColorVariant,
  { icon: string; value: string; border: string }
> = {
  navy: {
    icon: "bg-[#0f1e4a] text-white",
    value: "text-[#0f1e4a]",
    border: "border-t-4 border-t-[#0f1e4a]",
  },
  yellow: {
    icon: "bg-[#F7C905] text-[#0f1e4a]",
    value: "text-[#0f1e4a]",
    border: "border-t-4 border-t-[#F7C905]",
  },
  green: {
    icon: "bg-emerald-500 text-white",
    value: "text-emerald-700",
    border: "border-t-4 border-t-emerald-500",
  },
  red: {
    icon: "bg-rose-500 text-white",
    value: "text-rose-700",
    border: "border-t-4 border-t-rose-500",
  },
  purple: {
    icon: "bg-violet-500 text-white",
    value: "text-violet-700",
    border: "border-t-4 border-t-violet-500",
  },
};

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  color?: ColorVariant;
  /** Entrance order for staggered reveal (0, 1, 2, …). */
  stagger?: number;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  color = "navy",
  stagger = 0,
}: StatsCardProps) {
  const styles = variantStyles[color];
  return (
    <Card
      className={cn(
        "welc-card-glow welc-card-hover welc-rise overflow-hidden",
        styles.border
      )}
      style={{ "--stagger": stagger } as React.CSSProperties}
    >
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("rounded-xl p-3 shadow-sm", styles.icon)}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className={cn("text-3xl font-bold tabular-nums", styles.value)}>
            <CountUp value={value} />
          </p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
