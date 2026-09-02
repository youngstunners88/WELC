export const MAX_HISTORY_TURNS = 20;

const CONTROL_AND_HIDDEN_CHARS = new RegExp(
  "[\\x00-\\x1F\\x7F\\u200B-\\u200F\\u202A-\\u202E\\uFEFF]",
  "g"
);

/** Strip control/zero-width characters commonly used to obfuscate prompt
 * injection or smuggle instructions past naive filters. Not a substitute for
 * the model's own system-prompt guardrails, but removes cheap tricks.
 *
 * Built via `new RegExp(string)` rather than a `/.../ ` literal on purpose:
 * a literal with these code points typed directly risks the editor/tool
 * chain silently normalizing them into the literal invisible characters
 * instead of the intended escape sequences — exactly the bug this file once
 * shipped with. The string form keeps every code point as plain, visible
 * ASCII text (`\\uXXXX`), so there is nothing invisible in the source. */
export function sanitize(input: string): string {
  return input.replace(CONTROL_AND_HIDDEN_CHARS, "").trim();
}

export function cleanHistory(
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
