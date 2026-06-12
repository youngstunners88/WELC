import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
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

export default async function OwnerThreadPage({
  params,
}: {
  params: { threadId: string };
}) {
  const dict = await getDictionary();
  const m = dict.messages;
  if (!isMessagingConfigured()) notFound();

  const supabase = await createClient();

  const { data: threadData } = await supabase
    .from("message_threads")
    .select("*")
    .eq("id", params.threadId)
    .single<MessageThread>();
  if (!threadData) notFound();

  const { data: member } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", threadData.member_id)
    .single<{ full_name: string; role: string }>();

  const { data: msgs } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", params.threadId)
    .order("created_at", { ascending: true });

  const messages: DecryptedMessage[] = ((msgs as MessageRow[] | null) ?? []).map(
    (msg) => ({
      id: msg.id,
      sender_role: msg.sender_role,
      body: decryptMessage(msg.ciphertext),
      created_at: msg.created_at,
      requires_ack: msg.requires_ack,
    })
  );

  // Clear the owner's unread counter for this thread.
  await supabase.rpc("rpc_mark_thread_read", { p_thread_id: params.threadId });

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-2xl flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 rounded-t-2xl border border-b-0 bg-[#0f1e4a] px-4 py-3 text-white">
        <Link
          href="/owner/messages"
          className="rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label={dict.common.back ?? "Back"}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7C905] text-sm font-bold text-[#0f1e4a]">
          {(member?.full_name ?? "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{member?.full_name ?? "—"}</p>
          <p className="text-[11px] text-white/50">
            {member?.role === "teacher"
              ? dict.roles.teacher
              : dict.roles.student}
          </p>
        </div>
        <Badge className="gap-1 bg-white/10 text-[10px] text-white hover:bg-white/10">
          <Lock className="h-3 w-3" />
          {m.encrypted}
        </Badge>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col overflow-y-auto border-x bg-muted/20 px-4">
        <MessageList
          messages={messages}
          viewer="owner"
          academyLabel={m.academy}
          emptyLabel={m.ownerThreadEmpty}
          memberLastReadAt={threadData.member_last_read_at}
          dict={dict}
        />
      </div>

      {/* Reply */}
      <div className="rounded-b-2xl border border-t-0">
        <ReplyBox mode="owner" threadId={params.threadId} dict={dict} />
      </div>
    </div>
  );
}
