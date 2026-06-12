import {
  ScrollText,
  LogIn,
  Megaphone,
  CalendarClock,
  UserCog,
  Activity,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/datetime";
import type { AuditRow } from "@/types/database";

interface RawAudit {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

const ICONS: Record<string, typeof Activity> = {
  "auth.login": LogIn,
  "broadcast.send": Megaphone,
  "broadcast.schedule": CalendarClock,
  "broadcast.cancel": CalendarClock,
  "user.role_change": UserCog,
  "user.teacher_rejected": UserCog,
};

export default async function OwnerAuditPage() {
  const dict = await getDictionary();
  const a = dict.audit;
  const supabase = await createClient();

  const { data: adata } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  const raw = (adata as RawAudit[] | null) ?? [];

  // Resolve actor names
  const actorIds = Array.from(
    new Set(raw.map((r) => r.actor_id).filter(Boolean))
  ) as string[];
  let nameMap = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", actorIds);
    nameMap = new Map(
      ((profs as { id: string; full_name: string }[] | null) ?? []).map((p) => [
        p.id,
        p.full_name,
      ])
    );
  }

  const rows: AuditRow[] = raw.map((r) => ({
    id: r.id,
    actor_name: r.actor_id ? nameMap.get(r.actor_id) ?? "—" : a.system,
    actor_role: r.actor_role,
    action: r.action,
    target_type: r.target_type,
    target_id: r.target_id,
    detail: r.detail,
    created_at: r.created_at,
  }));

  const actionLabel = (action: string): string =>
    (a.actions as Record<string, string>)[action] ?? action;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ScrollText className="h-6 w-6 text-[#0f1e4a]" />
          {a.title}
        </h1>
        <p className="text-sm text-muted-foreground">{a.subtitle}</p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          {a.empty}
        </p>
      ) : (
        <div className="divide-y rounded-xl border bg-card">
          {rows.map((r) => {
            const Icon = ICONS[r.action] ?? Activity;
            return (
              <div key={r.id} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5 rounded-lg bg-muted p-2 text-[#0f1e4a]">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{actionLabel(r.action)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.actor_name}
                    {r.actor_role ? ` · ${r.actor_role}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatDateTime(r.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
