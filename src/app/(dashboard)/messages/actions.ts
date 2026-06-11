"use server";

import { revalidatePath } from "next/cache";
import { requireRoleAction } from "@/lib/auth/guard";
import { encryptMessage, isMessagingConfigured } from "@/lib/crypto/messages";

const MAX_LEN = 2000;

type Audience = "all" | "teachers" | "students";

function validateBody(body: string): { ok: true; text: string } | { ok: false; error: string } {
  const text = body.trim();
  if (!text) return { ok: false, error: "Message is required" };
  if (text.length > MAX_LEN) return { ok: false, error: "Message is too long" };
  return { ok: true, text };
}

/** Owner → audience broadcast. Fans out into each member's private thread. */
export async function sendBroadcast(audience: Audience, body: string) {
  if (!isMessagingConfigured()) {
    return { error: "Secure messaging is not configured yet." };
  }
  if (!["all", "teachers", "students"].includes(audience)) {
    return { error: "Unknown audience" };
  }
  const v = validateBody(body);
  if (!v.ok) return { error: v.error };

  const auth = await requireRoleAction(["owner"]);
  if (!auth.ok) return { error: auth.error };

  const { data, error } = await auth.supabase.rpc("rpc_owner_broadcast", {
    p_audience: audience,
    p_ciphertext: encryptMessage(v.text),
  });
  if (error) return { error: error.message };

  revalidatePath("/owner/messages");
  return { success: true, count: (data as number) ?? 0 };
}

/** Owner starts (or continues) a direct 1:1 message with any member. */
export async function ownerDm(memberId: string, body: string) {
  if (!isMessagingConfigured()) {
    return { error: "Secure messaging is not configured yet." };
  }
  const v = validateBody(body);
  if (!v.ok) return { error: v.error };

  const auth = await requireRoleAction(["owner"]);
  if (!auth.ok) return { error: auth.error };

  const { data, error } = await auth.supabase.rpc("rpc_owner_dm", {
    p_member_id: memberId,
    p_ciphertext: encryptMessage(v.text),
  });
  if (error) return { error: error.message };

  revalidatePath("/owner/messages");
  return { success: true, threadId: (data as string) ?? null };
}

/** Owner replies inside one member's thread. */
export async function ownerReply(threadId: string, body: string) {
  if (!isMessagingConfigured()) {
    return { error: "Secure messaging is not configured yet." };
  }
  const v = validateBody(body);
  if (!v.ok) return { error: v.error };

  const auth = await requireRoleAction(["owner"]);
  if (!auth.ok) return { error: auth.error };

  const { error } = await auth.supabase.rpc("rpc_owner_reply", {
    p_thread_id: threadId,
    p_ciphertext: encryptMessage(v.text),
  });
  if (error) return { error: error.message };

  revalidatePath(`/owner/messages/${threadId}`);
  revalidatePath("/owner/messages");
  return { success: true };
}

/**
 * Member reply. The RPC refuses if no thread exists, so a member can never
 * initiate — they can only answer the academy.
 */
export async function memberReply(body: string) {
  if (!isMessagingConfigured()) {
    return { error: "Secure messaging is not configured yet." };
  }
  const v = validateBody(body);
  if (!v.ok) return { error: v.error };

  const auth = await requireRoleAction(["teacher", "student"]);
  if (!auth.ok) return { error: auth.error };

  const { error } = await auth.supabase.rpc("rpc_member_reply", {
    p_ciphertext: encryptMessage(v.text),
  });
  if (error) return { error: error.message };

  revalidatePath("/messages");
  return { success: true };
}

/** Clear the caller's unread counter on a thread. */
export async function markThreadRead(threadId: string) {
  const auth = await requireRoleAction();
  if (!auth.ok) return { error: auth.error };
  await auth.supabase.rpc("rpc_mark_thread_read", { p_thread_id: threadId });
  return { success: true };
}
