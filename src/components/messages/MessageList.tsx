import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";
import { formatDateTime } from "@/lib/datetime";
import type { DecryptedMessage } from "@/types/database";

/**
 * Renders a thread's decrypted messages as chat bubbles. A message is shown on
 * the right ("mine") when its sender matches the viewer's side.
 */
export function MessageList({
  messages,
  viewer,
  academyLabel,
  emptyLabel,
}: {
  messages: DecryptedMessage[];
  viewer: "owner" | "member";
  academyLabel: string;
  emptyLabel: string;
}) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-sm text-muted-foreground">
        <ShieldCheck className="h-6 w-6 text-[#0f1e4a]/40" />
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 py-2">
      {messages.map((m) => {
        const mine =
          (viewer === "owner" && m.sender_role === "owner") ||
          (viewer === "member" && m.sender_role === "member");
        return (
          <div
            key={m.id}
            className={cn("flex flex-col", mine ? "items-end" : "items-start")}
          >
            {!mine && m.sender_role === "owner" && (
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
              {m.body}
            </div>
            <span className="mt-0.5 px-1 text-[10px] text-muted-foreground">
              {formatDateTime(m.created_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
