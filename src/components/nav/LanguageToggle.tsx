"use client";

import { useTransition } from "react";
import { setLocale } from "@/lib/i18n/actions";
import { cn } from "@/lib/utils";

export function LanguageToggle({ current }: { current?: "ko" | "en" }) {
  const [isPending, startTransition] = useTransition();

  function choose(locale: "ko" | "en") {
    startTransition(() => {
      void setLocale(locale);
    });
  }

  return (
    <div className="inline-flex items-center rounded-md border text-sm">
      <button
        type="button"
        disabled={isPending}
        onClick={() => choose("ko")}
        className={cn(
          "rounded-l-md px-3 py-1.5 transition-colors",
          current === "ko"
            ? "bg-primary text-primary-foreground"
            : "hover:bg-accent hover:text-accent-foreground"
        )}
      >
        한국어
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => choose("en")}
        className={cn(
          "rounded-r-md px-3 py-1.5 transition-colors",
          current === "en"
            ? "bg-primary text-primary-foreground"
            : "hover:bg-accent hover:text-accent-foreground"
        )}
      >
        EN
      </button>
    </div>
  );
}
