"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { memberReply, ownerReply } from "@/app/(dashboard)/messages/actions";
import type { Dictionary } from "@/lib/i18n";

/**
 * Reply composer. `mode="owner"` posts into a specific thread; `mode="member"`
 * answers the academy (the server refuses if no thread exists, so members can
 * never start a conversation).
 */
export function ReplyBox({
  mode,
  threadId,
  dict,
  disabled,
}: {
  mode: "owner" | "member";
  threadId?: string;
  dict: Dictionary;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const taRef = useRef<HTMLTextAreaElement>(null);

  function send() {
    const text = value.trim();
    if (!text) return;
    startTransition(async () => {
      const res =
        mode === "owner"
          ? await ownerReply(threadId ?? "", text)
          : await memberReply(text);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      setValue("");
      router.refresh();
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex items-end gap-2 border-t bg-card p-3">
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        disabled={disabled || isPending}
        placeholder={dict.messages.replyPlaceholder}
        className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0f1e4a]/20 disabled:opacity-60"
      />
      <Button
        size="icon"
        onClick={send}
        disabled={disabled || isPending || !value.trim()}
        className="h-[42px] w-[42px] shrink-0 bg-[#0f1e4a] hover:bg-[#0f1e4a]/90"
        aria-label={dict.messages.send}
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
