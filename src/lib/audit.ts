import "server-only";
import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Append an entry to the owner-readable audit log. Best-effort: a logging
 * failure must never break the action it accompanies, so errors are swallowed.
 * The DB forces actor = auth.uid(), so callers can't forge identity.
 */
export async function logAudit(
  supabase: ServerClient,
  action: string,
  targetType: string | null,
  targetId: string | null,
  detail: Record<string, unknown> = {}
): Promise<void> {
  try {
    await supabase.rpc("rpc_log_audit", {
      p_action: action,
      p_target_type: targetType,
      p_target_id: targetId,
      p_detail: detail,
    });
  } catch {
    /* audit is non-critical — never surface to the user */
  }
}
