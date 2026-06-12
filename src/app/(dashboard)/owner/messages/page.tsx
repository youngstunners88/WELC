import Link from "next/link";
import { MessagesSquare, ChevronRight, ShieldAlert, Lock, Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { FlightMotif } from "@/components/brand/FlightMotif";
import { Badge } from "@/components/ui/badge";
import { BroadcastComposer } from "@/components/messages/BroadcastComposer";
import { NewDmComposer } from "@/components/messages/NewDmComposer";
import { decryptMessage, isMessagingConfigured } from "@/lib/crypto/messages";
import { formatDateTime } from "@/lib/datetime";
import type { MessageThread, MessageRow, OwnerThreadRow } from "@/types/database";

export default async function OwnerMessagesPage() {
  const dict = await getDictionary();
  const m = dict.messages;
  const configured = isMessagingConfigured();
  const supabase = await createClient();

  let rows: OwnerThreadRow[] = [];
  let members: { id: string; name: string; role: "teacher" | "student" }[] = [];

  if (configured) {
    const { data: allMembers } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["teacher", "student"])
      .order("full_name");
    members = (
      (allMembers as { id: string; full_name: string; role: string }[] | null) ??
      []
    ).map((p) => ({
      id: p.id,
      name: p.full_name,
      role: (p.role === "teacher" ? "teacher" : "student") as
        | "teacher"
        | "student",
    }));
  }

  if (configured) {
    const { data: threadsData } = await supabase
      .from("message_threads")
      .select("*")
      .order("last_message_at", { ascending: false });
    const threads = (threadsData as MessageThread[] | null) ?? [];

    if (threads.length > 0) {
      const memberIds = threads.map((t) => t.member_id);
      const threadIds = threads.map((t) => t.id);

      const [{ data: profs }, { data: msgs }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, role")
          .in("id", memberIds),
        supabase
          .from("messages")
          .select("thread_id, ciphertext, created_at, sender_role")
          .in("thread_id", threadIds)
          .order("created_at", { ascending: false }),
      ]);

      const profMap = new Map(
        ((profs as { id: string; full_name: string; role: string }[] | null) ?? []).map(
          (p) => [p.id, p]
        )
      );
      const latest = new Map<string, MessageRow>();
      for (const msg of (msgs as MessageRow[] | null) ?? []) {
        if (!latest.has(msg.thread_id)) latest.set(msg.thread_id, msg);
      }

      rows = threads.map((t) => {
        const p = profMap.get(t.member_id);
        const last = latest.get(t.id);
        return {
          id: t.id,
          member_id: t.member_id,
          member_name: p?.full_name ?? "—",
          member_role: (p?.role === "teacher" ? "teacher" : "student") as
            | "teacher"
            | "student",
          last_message_at: t.last_message_at,
          owner_unread: t.owner_unread,
          preview: last ? decryptMessage(last.ciphertext) : "",
        };
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="welc-sky welc-glint welc-rise relative overflow-hidden rounded-2xl px-8 py-7 text-white shadow-md">
        <FlightMotif />
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#F7C905]">
            <Lock className="h-4 w-4" />
            {m.encrypted}
          </div>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold">
            <MessagesSquare className="h-6 w-6 text-[#F7C905]" />
            {m.ownerTitle}
          </h1>
          <p className="mt-1 text-sm text-white/60">{m.ownerSubtitle}</p>
          <Link
            href="/owner/announcements"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
          >
            <Megaphone className="h-3.5 w-3.5" />
            {m.viewAnnouncements}
          </Link>
        </div>
      </div>

      {!configured ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{m.notConfiguredTitle}</p>
            <p className="text-amber-800">{m.notConfiguredHint}</p>
          </div>
        </div>
      ) : (
        <>
          <BroadcastComposer dict={dict} />

          <NewDmComposer members={members} dict={dict} />

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {m.conversations}
            </p>
            {rows.length === 0 ? (
              <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
                {m.noConversations}
              </p>
            ) : (
              <div className="divide-y rounded-xl border bg-card">
                {rows.map((r) => (
                  <Link
                    key={r.id}
                    href={`/owner/messages/${r.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0f1e4a] text-sm font-bold text-[#F7C905]">
                      {r.member_name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{r.member_name}</span>
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          {r.member_role === "teacher"
                            ? dict.roles.teacher
                            : dict.roles.student}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.preview || "—"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDateTime(r.last_message_at)}
                      </span>
                      {r.owner_unread > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F7C905] px-1.5 text-[10px] font-bold text-[#0f1e4a]">
                          {r.owner_unread}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
