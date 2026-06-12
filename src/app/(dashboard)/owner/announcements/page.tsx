import Link from "next/link";
import {
  Megaphone,
  ArrowLeft,
  Eye,
  CheckCircle2,
  Clock,
  Repeat,
  Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { BroadcastCancelButton } from "@/components/messages/BroadcastCancelButton";
import { decryptMessage, isMessagingConfigured } from "@/lib/crypto/messages";
import { formatDateTime } from "@/lib/datetime";
import type { BroadcastRow } from "@/types/database";

interface RawBroadcast {
  id: string;
  audience: "all" | "teachers" | "students";
  requires_ack: boolean;
  send_at: string | null;
  recurrence: "none" | "weekly" | "monthly";
  status: "pending" | "sent" | "cancelled";
  sent_count: number | null;
  created_at: string;
  sent_at: string | null;
  ciphertext: string;
}

export default async function OwnerAnnouncementsPage() {
  const dict = await getDictionary();
  const m = dict.messages;
  const supabase = await createClient();

  let rows: BroadcastRow[] = [];

  if (isMessagingConfigured()) {
    const { data: bdata } = await supabase
      .from("broadcasts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    const broadcasts = (bdata as RawBroadcast[] | null) ?? [];

    if (broadcasts.length > 0) {
      const ids = broadcasts.map((b) => b.id);
      const [{ data: msgs }, { data: threads }] = await Promise.all([
        supabase
          .from("messages")
          .select("id, broadcast_id, thread_id, created_at")
          .in("broadcast_id", ids),
        supabase.from("message_threads").select("id, member_last_read_at"),
      ]);

      const threadRead = new Map(
        (
          (threads as { id: string; member_last_read_at: string | null }[] | null) ??
          []
        ).map((t) => [t.id, t.member_last_read_at])
      );
      const msgRows =
        (msgs as
          | { id: string; broadcast_id: string; thread_id: string; created_at: string }[]
          | null) ?? [];

      // acks for these messages
      const msgIds = msgRows.map((r) => r.id);
      let ackByMsg = new Set<string>();
      if (msgIds.length > 0) {
        const { data: acks } = await supabase
          .from("message_acks")
          .select("message_id")
          .in("message_id", msgIds);
        ackByMsg = new Set(
          ((acks as { message_id: string }[] | null) ?? []).map((a) => a.message_id)
        );
      }

      rows = broadcasts.map((b) => {
        const mine = msgRows.filter((r) => r.broadcast_id === b.id);
        const total = mine.length;
        const seen = mine.filter((r) => {
          const lr = threadRead.get(r.thread_id);
          return lr ? new Date(lr).getTime() >= new Date(r.created_at).getTime() : false;
        }).length;
        const acked = mine.filter((r) => ackByMsg.has(r.id)).length;
        return {
          id: b.id,
          audience: b.audience,
          requires_ack: b.requires_ack,
          send_at: b.send_at,
          recurrence: b.recurrence,
          status: b.status,
          sent_count: b.sent_count,
          created_at: b.created_at,
          sent_at: b.sent_at,
          preview: decryptMessage(b.ciphertext),
          total,
          seen,
          acked,
        };
      });
    }
  }

  const audienceLabel = (a: BroadcastRow["audience"]) =>
    a === "all" ? m.audAll : a === "teachers" ? m.audTeachers : m.audStudents;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/owner/messages"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          aria-label={dict.common.back ?? "Back"}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Megaphone className="h-6 w-6 text-[#0f1e4a]" />
            {m.announcements}
          </h1>
          <p className="text-sm text-muted-foreground">{m.announcementsHint}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          {m.noAnnouncements}
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((b) => (
            <div key={b.id} className="welc-card-glow rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{audienceLabel(b.audience)}</Badge>
                {b.status === "pending" && (
                  <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100">
                    <Clock className="h-3 w-3" />
                    {m.statusScheduled}
                  </Badge>
                )}
                {b.status === "sent" && (
                  <Badge className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                    <Send className="h-3 w-3" />
                    {m.statusSent}
                  </Badge>
                )}
                {b.status === "cancelled" && (
                  <Badge variant="outline">{m.statusCancelled}</Badge>
                )}
                {b.requires_ack && (
                  <Badge className="gap-1 bg-[#0f1e4a] text-white hover:bg-[#0f1e4a]">
                    <CheckCircle2 className="h-3 w-3" />
                    {m.ackRequired}
                  </Badge>
                )}
                {b.recurrence !== "none" && (
                  <Badge variant="outline" className="gap-1">
                    <Repeat className="h-3 w-3" />
                    {b.recurrence === "weekly" ? m.recurWeekly : m.recurMonthly}
                  </Badge>
                )}
              </div>

              <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm">
                {b.preview}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {b.status === "sent" && (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {m.seenCount
                        .replace("{seen}", String(b.seen))
                        .replace("{total}", String(b.total))}
                    </span>
                    {b.requires_ack && (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {m.ackCount
                          .replace("{acked}", String(b.acked))
                          .replace("{total}", String(b.total))}
                      </span>
                    )}
                    <span>{formatDateTime(b.sent_at ?? b.created_at)}</span>
                  </>
                )}
                {b.status === "pending" && b.send_at && (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDateTime(b.send_at)}
                    </span>
                    <BroadcastCancelButton broadcastId={b.id} label={dict.common.cancel} />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
