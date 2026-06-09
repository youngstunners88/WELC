"use client";

import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotebookCta({ label, toastMsg }: { label: string; toastMsg: string }) {
  return (
    <Button
      size="lg"
      className="gap-2 bg-[#F7C905] text-[#0f1e4a] hover:bg-[#F7C905]/90"
      onClick={() => toast.success(toastMsg)}
    >
      <Sparkles className="h-4 w-4" />
      {label}
    </Button>
  );
}
