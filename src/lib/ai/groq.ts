import type { SupabaseClient } from "@supabase/supabase-js";
import { toolExecutors, toolSchemas } from "./tools";
import type { Role } from "@/lib/constants";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.AI_MODEL || "llama-3.3-70b-versatile";

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

function systemPrompt(role: Role): string {
  return `당신은 WELC Academy(위준성 영어 라이프 컨설팅, 항공 승무원 영어 전문)의 AI 어시스턴트입니다.
현재 사용자 역할: ${role}.

역할:
- 원장(owner): 전체 학원 운영 데이터를 조회할 수 있습니다.
- 강사(teacher): 본인 수업과 본인 학생 데이터를 조회할 수 있습니다.
- 학생(student): 본인 출석 데이터를 조회할 수 있습니다.

규칙:
1. 사용자가 한국어로 물으면 한국어로, 영어로 물으면 영어로 답하세요.
2. 데이터가 필요하면 반드시 제공된 도구(함수)를 호출해서 실제 데이터를 가져오세요. 절대 숫자를 추측하지 마세요.
3. 도구가 데이터를 반환하지 않거나 권한이 없으면, 솔직하게 "데이터가 없거나 권한이 없습니다"라고 말하세요.
4. 답변은 간결하고 명확하게. 표나 목록이 도움이 되면 사용하세요.
5. 당신은 읽기 전용입니다. 데이터를 수정하거나 삭제할 수 없습니다. 그런 요청을 받으면 대시보드에서 직접 하도록 안내하세요.`;
}

interface GroqChoice {
  message: { content: string | null; tool_calls?: ToolCall[] };
  finish_reason: string;
}

async function callGroq(
  apiKey: string,
  messages: ChatMessage[],
  useTools: boolean
): Promise<GroqChoice> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 900,
      ...(useTools ? { tools: toolSchemas, tool_choice: "auto" } : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI provider error (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.choices[0] as GroqChoice;
}

/**
 * Run one assistant turn with tool-calling. Executes any requested read-only
 * tools against the caller's RLS-scoped client, then returns the final text.
 */
export async function runAssistant({
  apiKey,
  supabase,
  role,
  history,
  message,
}: {
  apiKey: string;
  supabase: SupabaseClient;
  role: Role;
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
}): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt(role) },
    ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  // Up to 3 tool rounds, then force a final text answer.
  for (let i = 0; i < 3; i++) {
    const choice = await callGroq(apiKey, messages, true);
    const toolCalls = choice.message.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      return choice.message.content ?? "";
    }

    messages.push({
      role: "assistant",
      content: choice.message.content,
      tool_calls: toolCalls,
    });

    for (const tc of toolCalls) {
      const exec = toolExecutors[tc.function.name];
      let result: unknown;
      if (!exec) {
        result = { ok: false, note: "Unknown tool" };
      } else {
        let args: Record<string, unknown> = {};
        try {
          args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
        } catch {
          args = {};
        }
        try {
          result = await exec(supabase, args);
        } catch (e) {
          result = { ok: false, note: (e as Error).message };
        }
      }
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }
  }

  // Final pass without tools to summarise whatever was gathered.
  const final = await callGroq(apiKey, messages, false);
  return final.message.content ?? "";
}
