import { Lock, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { MessageList } from "@/components/messages/MessageList";
import { ReplyBox } from "@/components/messages/ReplyBox";
import { decryptMessage, isMessagingConfigured } from "@/lib/crypto/messages";
import type {
  MessageThread,
  MessageRow,
  DecryptedMessage,
} from "@/types/database";

export default async function MemberMessagesPage() {
  const dict = await getDictionary();
  const m = dict.messages;
  const configured = isMessagingConfigured();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let thread: MessageThread | null = null;
  let messages: DecryptedMessage[] = [];

  if (configured && user) {
    const { data: t } = await supabase
      .from("message_threads")
      .select("*")
      .eq("member_id", user.id)
      .maybeSingle<MessageThread>();
    thread = t ?? null;

    if (thread) {
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: true });
      const rows = (msgs as MessageRow[] | null) ?? [];

      // Which ack-required messages has this member already acknowledged?
      const ackIds = rows.filter((r) => r.requires_ack).map((r) => r.id);
      let ackedSet = new Set<string>();
      if (ackIds.length > 0) {
        const { data: acks } = await supabase
          .from("message_acks")
          .select("message_id")
          .eq("user_id", user.id)
          .in("message_id", ackIds);
        ackedSet = new Set(
          ((acks as { message_id: string }[] | null) ?? []).map(
            (a) => a.message_id
          )
        );
      }

      messages = rows.map((msg) => ({
        id: msg.id,
        sender_role: msg.sender_role,
        body: decryptMessage(msg.ciphertext),
        created_at: msg.created_at,
        requires_ack: msg.requires_ack,
        acked: ackedSet.has(msg.id),
      }));
      await supabase.rpc("rpc_mark_thread_read", { p_thread_id: thread.id });
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-2xl flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 rounded-t-2xl border border-b-0 bg-[#0f1e4a] px-4 py-3 text-white">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7C905] text-sm font-bold text-[#0f1e4a]">
          ✈
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{m.academy}</p>
          <p className="text-[11px] text-white/50">{m.memberSubtitle}</p>
        </div>
        <Badge className="gap-1 bg-white/10 text-[10px] text-white hover:bg-white/10">
          <Lock className="h-3 w-3" />
          {m.encrypted}
        </Badge>
      </div>

      {!configured ? (
        <div className="flex flex-1 items-start gap-3 rounded-b-2xl border bg-amber-50 p-4 text-sm text-amber-900">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{m.notConfiguredHint}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-1 flex-col overflow-y-auto border-x bg-muted/20 px-4">
            <MessageList
              messages={messages}
              viewer="member"
              academyLabel={m.academy}
              emptyLabel={m.memberEmpty}
              dict={dict}
            />
          </div>
          <div className="rounded-b-2xl border border-t-0">
            {/* No thread yet → members cannot initiate; the box is disabled with
                a hint, and the server RPC also refuses. */}
            <ReplyBox
              mode="member"
              dict={dict}
              disabled={!thread}
            />
            {!thread && (
              <p className="px-3 pb-3 text-center text-xs text-muted-foreground">
                {m.cannotInitiate}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
