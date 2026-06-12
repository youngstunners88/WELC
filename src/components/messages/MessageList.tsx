import { cn } from "@/lib/utils";
import { ShieldCheck, Check } from "lucide-react";
import { formatDateTime } from "@/lib/datetime";
import { AckButton } from "@/components/messages/AckButton";
import type { DecryptedMessage } from "@/types/database";
import type { Dictionary } from "@/lib/i18n";

/**
 * Renders a thread's decrypted messages as chat bubbles. A message is shown on
 * the right ("mine") when its sender matches the viewer's side.
 *
 * - Owner viewer: owner messages seen by the member show a "Seen" receipt.
 * - Member viewer: owner messages flagged requires_ack show an Acknowledge button.
 */
export function MessageList({
  messages,
  viewer,
  academyLabel,
  emptyLabel,
  memberLastReadAt,
  dict,
}: {
  messages: DecryptedMessage[];
  viewer: "owner" | "member";
  academyLabel: string;
  emptyLabel: string;
  memberLastReadAt?: string | null;
  dict: Dictionary;
}) {
  const m = dict.messages;

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-sm text-muted-foreground">
        <ShieldCheck className="h-6 w-6 text-[#0f1e4a]/40" />
        {emptyLabel}
      </div>
    );
  }

  const lastReadMs = memberLastReadAt ? new Date(memberLastReadAt).getTime() : 0;

  return (
    <div className="flex flex-col gap-3 py-2">
      {messages.map((msg) => {
        const mine =
          (viewer === "owner" && msg.sender_role === "owner") ||
          (viewer === "member" && msg.sender_role === "member");
        const seenByMember =
          viewer === "owner" &&
          msg.sender_role === "owner" &&
          lastReadMs >= new Date(msg.created_at).getTime();

        return (
          <div
            key={msg.id}
            className={cn("flex flex-col", mine ? "items-end" : "items-start")}
          >
            {!mine && msg.sender_role === "owner" && (
              <span className="mb-0.5 px-1 text-[11px] font-semibold text-[#0f1e4a]">
                {academyLabel}
              </span>
            )}
            <div
              className={cn(
                "max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                mine
                  ? "rounded-br-sm bg-[#0f1e4a] text-white"
                  : "rounded-bl-sm border bg-card text-foreground"
              )}
            >
              {msg.body}
            </div>

            {/* Member-side acknowledge control */}
            {viewer === "member" &&
              msg.sender_role === "owner" &&
              msg.requires_ack && (
                <AckButton
                  messageId={msg.id}
                  acked={Boolean(msg.acked)}
                  ackLabel={m.ackNow}
                  ackedLabel={m.acked}
                />
              )}

            <span className="mt-0.5 flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
              {formatDateTime(msg.created_at)}
              {seenByMember && (
                <span className="inline-flex items-center gap-0.5 text-emerald-600">
                  <Check className="h-3 w-3" />
                  {m.seen}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
