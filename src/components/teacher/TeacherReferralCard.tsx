"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Dictionary } from "@/lib/i18n";

export function TeacherReferralCard({
  link,
  dict,
}: {
  link: string;
  dict: Dictionary;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success(dict.referral.copied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(dict.common.error);
    }
  }

  return (
    <Card className="welc-card-glow border-t-4 border-t-[#F7C905]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4" />
          {dict.referral.title}
        </CardTitle>
        <CardDescription>{dict.referral.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={link} readOnly className="font-mono text-xs" />
          <Button onClick={copy} className="shrink-0 gap-2">
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {dict.referral.copy}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
