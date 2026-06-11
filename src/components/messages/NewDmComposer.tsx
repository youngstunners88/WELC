"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ownerDm } from "@/app/(dashboard)/messages/actions";
import type { Dictionary } from "@/lib/i18n";

interface MemberOption {
  id: string;
  name: string;
  role: "teacher" | "student";
}

/** Owner-only: start a direct 1:1 message with any teacher or student. */
export function NewDmComposer({
  members,
  dict,
}: {
  members: MemberOption[];
  dict: Dictionary;
}) {
  const m = dict.messages;
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    const text = body.trim();
    if (!text || !memberId) return;
    startTransition(async () => {
      const res = await ownerDm(memberId, text);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      setBody("");
      setOpen(false);
      if (res.threadId) {
        router.push(`/owner/messages/${res.threadId}`);
      } else {
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-2"
        disabled={members.length === 0}
      >
        <UserPlus className="h-4 w-4" />
        {m.newDm}
      </Button>
    );
  }

  return (
    <div className="welc-card-glow space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <UserPlus className="h-4 w-4 text-[#0f1e4a]" />
          {m.newDm}
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          aria-label={dict.common.cancel}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
        <option value="">{m.pickRecipient}</option>
        {members.map((mem) => (
          <option key={mem.id} value={mem.id}>
            {mem.name} ·{" "}
            {mem.role === "teacher" ? dict.roles.teacher : dict.roles.student}
          </option>
        ))}
      </Select>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder={m.replyPlaceholder}
        className="w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0f1e4a]/20"
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{m.encryptedNote}</span>
        <Button
          onClick={submit}
          disabled={isPending || !body.trim() || !memberId}
          className="gap-2 bg-[#0f1e4a] hover:bg-[#0f1e4a]/90"
        >
          <Send className="h-4 w-4" />
          {m.send}
        </Button>
      </div>
    </div>
  );
}
