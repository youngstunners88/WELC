/**
 * KakaoTalk AlimTalk (알림톡) sender. Designed to be a no-op until the owner
 * completes Kakao Business setup and provides a SenderKey — the app never breaks
 * when Kakao isn't configured; it just falls back to in-app notifications.
 *
 * We target a generic provider gateway (NHN Cloud / Infobip / Sendbird style),
 * configured entirely through env vars so no code change is needed at go-live.
 */

export function isAlimtalkConfigured(): boolean {
  return Boolean(
    process.env.KAKAO_ALIMTALK_SENDER_KEY &&
      process.env.KAKAO_ALIMTALK_API_KEY &&
      process.env.KAKAO_ALIMTALK_API_URL
  );
}

export interface AlimtalkRecipient {
  phone: string | null;
  variables?: Record<string, string>;
}

export interface AlimtalkResult {
  attempted: number;
  sent: number;
  configured: boolean;
}

/**
 * Send a templated AlimTalk message to a list of recipients. Recipients without
 * a phone number are skipped. Returns a summary; never throws (failures degrade
 * to the in-app notification already created by the caller).
 */
export async function sendAlimtalk(
  templateCode: string,
  recipients: AlimtalkRecipient[],
  fallbackText: string
): Promise<AlimtalkResult> {
  const withPhone = recipients.filter((r) => r.phone);
  if (!isAlimtalkConfigured()) {
    return { attempted: withPhone.length, sent: 0, configured: false };
  }

  const url = process.env.KAKAO_ALIMTALK_API_URL!;
  const senderKey = process.env.KAKAO_ALIMTALK_SENDER_KEY!;
  const apiKey = process.env.KAKAO_ALIMTALK_API_KEY!;

  let sent = 0;
  for (const r of withPhone) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Secret-Key": apiKey,
        },
        body: JSON.stringify({
          senderKey,
          templateCode,
          recipientList: [
            {
              recipientNo: r.phone,
              templateParameter: r.variables ?? {},
              content: fallbackText,
            },
          ],
        }),
      });
      if (res.ok) sent += 1;
    } catch {
      // swallow — in-app notification already covers this recipient
    }
  }
  return { attempted: withPhone.length, sent, configured: true };
}
