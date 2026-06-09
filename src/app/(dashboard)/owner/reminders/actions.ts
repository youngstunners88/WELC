"use server";

import { revalidatePath } from "next/cache";
import { requireRoleAction } from "@/lib/auth/guard";
import { sendAlimtalk } from "@/lib/kakao/alimtalk";

export type Audience = "session" | "tomorrow" | "all_students";
const AUDIENCES: Audience[] = ["session", "tomorrow", "all_students"];

interface Recipient {
  recipient_id: string;
  full_name: string;
  phone: string | null;
  kakao_consent: boolean;
}

/** Send an in-app reminder now (and AlimTalk to consented recipients). */
export async function sendReminderNow(
  audience: Audience,
  sessionId: string | null,
  message: string
) {
  if (!AUDIENCES.includes(audience)) return { error: "Invalid audience" };
  const msg = message.trim();
  if (!msg) return { error: "Message is required" };

  const auth = await requireRoleAction(["owner", "teacher"]);
  if (!auth.ok) return { error: auth.error };

  const { data, error } = await auth.supabase.rpc("rpc_send_reminder", {
    p_audience: audience,
    p_session_id: sessionId,
    p_message: msg,
  });
  if (error) return { error: error.message };

  const recipients = (data as Recipient[] | null) ?? [];
  const kakao = await sendAlimtalk(
    "WELC_REMINDER",
    recipients
      .filter((r) => r.kakao_consent && r.phone)
      .map((r) => ({ phone: r.phone, variables: { message: msg } })),
    msg
  );

  revalidatePath("/owner/reminders");
  return {
    success: true,
    count: recipients.length,
    kakaoConfigured: kakao.configured,
    kakaoSent: kakao.sent,
  };
}

/** Schedule a reminder for a future time (cron dispatches it). */
export async function scheduleReminder(
  audience: Audience,
  sessionId: string | null,
  message: string,
  sendAtIso: string
) {
  if (!AUDIENCES.includes(audience)) return { error: "Invalid audience" };
  const msg = message.trim();
  if (!msg) return { error: "Message is required" };
  const when = new Date(sendAtIso);
  if (isNaN(when.getTime()) || when.getTime() < Date.now())
    return { error: "Pick a future time" };

  const auth = await requireRoleAction(["owner", "teacher"]);
  if (!auth.ok) return { error: auth.error };

  const { error } = await auth.supabase.from("scheduled_reminders").insert({
    created_by: auth.userId,
    audience,
    session_id: sessionId,
    message: msg,
    send_at: when.toISOString(),
  });
  if (error) return { error: error.message };
  revalidatePath("/owner/reminders");
  return { success: true };
}

export async function cancelReminder(id: string) {
  const auth = await requireRoleAction(["owner", "teacher"]);
  if (!auth.ok) return { error: auth.error };
  const { error } = await auth.supabase
    .from("scheduled_reminders")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/owner/reminders");
  return { success: true };
}
