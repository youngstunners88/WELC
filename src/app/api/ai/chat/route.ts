import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAssistant } from "@/lib/ai/groq";
import type { Role } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 30;

interface Body {
  message?: string;
  history?: { role: "user" | "assistant"; content: string }[];
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

  const message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "Empty message" }, { status: 400 });
  if (message.length > 1000)
    return NextResponse.json({ error: "Message too long" }, { status: 400 });

  try {
    const answer = await runAssistant({
      apiKey,
      supabase,
      role: profile.role,
      history: Array.isArray(body.history) ? body.history : [],
      message,
    });
    return NextResponse.json({ answer });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "AI error" },
      { status: 500 }
    );
  }
}
