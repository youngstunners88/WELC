import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAssistant } from "@/lib/ai/groq";
import { rateLimit } from "@/lib/rate-limit";
import { captureError } from "@/lib/observability";
import type { Role } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_MESSAGE_CHARS = 500;
const MAX_HISTORY_TURNS = 20;
const DAILY_MESSAGE_LIMIT = 50;

interface Body {
  message?: string;
  history?: { role: "user" | "assistant"; content: string }[];
}

/** Strip control/zero-width characters commonly used to obfuscate prompt
 * injection or smuggle instructions past naive filters. Not a substitute for
 * the model's own system-prompt guardrails, but removes cheap tricks. */
function sanitize(input: string): string {
  return input
    // Strip control chars (\x00-\x1F, \x7F) and zero-width / bidi-override
    // chars (U+200B-U+200F, U+202A-U+202E, U+FEFF) used to hide or reorder
    // text and smuggle instructions past naive filters.
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F\u200B-\u200F\u202A-\u202E\uFEFF]/g, "")
    .trim();
}

function cleanHistory(
  raw: unknown
): { role: "user" | "assistant"; content: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is { role: "user" | "assistant"; content: string } =>
        !!m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => ({ role: m.role, content: sanitize(m.content).slice(0, 2000) }));
}

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI is not configured." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Identity for this request is always derived from the verified session —
  // never trust a client-supplied user id — so `user.id` here is guaranteed
  // to be a real, authenticated UUID.
  const { ok: withinHourlyLimit } = rateLimit(`ai-chat:${user.id}`, 50, 60 * 60_000);
  if (!withinHourlyLimit) {
    return NextResponse.json(
      { error: "You've hit the hourly message limit. Please try again later." },
      { status: 429 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: Role }>();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const message = sanitize(body.message ?? "");
  if (!message) return NextResponse.json({ error: "Empty message" }, { status: 400 });
  if (message.length > MAX_MESSAGE_CHARS)
    return NextResponse.json({ error: "Message too long" }, { status: 400 });

  // Daily cap, enforced atomically in the database (rpc_check_and_bump_ai_usage)
  // so it survives across serverless instances, unlike the in-memory limiter.
  const { error: usageError } = await supabase.rpc("rpc_check_and_bump_ai_usage", {
    p_limit: DAILY_MESSAGE_LIMIT,
  });
  if (usageError) {
    return NextResponse.json({ error: usageError.message }, { status: 429 });
  }

  try {
    const answer = await runAssistant({
      apiKey,
      supabase,
      role: profile.role,
      history: cleanHistory(body.history),
      message,
    });
    return NextResponse.json({ answer });
  } catch (e) {
    captureError(e, { route: "api/ai/chat", userId: user.id });
    return NextResponse.json(
      { error: "The assistant is temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }
}
