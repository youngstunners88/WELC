#!/usr/bin/env node
// ops/llm/openrouter.mjs
//
// Thin CLI + library over OpenRouter's unified API, so any task can be
// delegated to whichever model actually fits it (a second opinion on a
// security-sensitive diff, a large-context read of the whole repo, a fast
// pass at boilerplate) without hand-rolling a fetch call each time.
//
// Requires OPENROUTER_API_KEY in the environment. Get one at
// https://openrouter.ai/keys — env vars are read at process start, so a key
// added to the environment after this session began won't be visible until
// a new session starts.
//
// Usage:
//   node ops/llm/openrouter.mjs models <provider-substring>
//     List live models matching a provider name (e.g. "qwen", "deepseek",
//     "moonshot" for Kimi, "x-ai" for Grok, "google" for Gemini). Prints
//     id, context length, and $/1M tokens so you can pick a specific model
//     id with current, real information instead of a guessed/stale one.
//
//   node ops/llm/openrouter.mjs ask <model-id> "<prompt>" [--system "..."] [--file path]
//     Send one prompt to one model. --file reads the prompt from a file
//     instead (for long context); the positional prompt is skipped if given.
//
//   node ops/llm/openrouter.mjs delegate <alias> "<prompt>" [--file path]
//     Resolve a short alias (qwen | deepseek | kimi | grok | gemini) to that
//     provider's top model by context length and ask it. Convenience only —
//     `ask` with an exact model id is more predictable for repeated use.
//
// Every call prints token usage and an estimated cost to stderr so spend
// stays visible even though no permission prompt gates each call.

const API_BASE = "https://openrouter.ai/api/v1";

const PROVIDER_ALIASES = {
  qwen: "qwen",
  deepseek: "deepseek",
  kimi: "moonshotai",
  moonshot: "moonshotai",
  grok: "x-ai",
  xai: "x-ai",
  gemini: "google",
  google: "google",
  claude: "anthropic",
  anthropic: "anthropic",
};

function apiKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    console.error(
      "Missing OPENROUTER_API_KEY. Add it to the environment (https://openrouter.ai/keys)\n" +
        "and start a new session — env vars are only read at session boot."
    );
    process.exit(2);
  }
  return key;
}

async function listModels(filter) {
  const res = await fetch(`${API_BASE}/models`);
  if (!res.ok) {
    console.error(`Failed to list models: ${res.status} ${await res.text()}`);
    process.exit(3);
  }
  const { data } = await res.json();
  const needle = (filter || "").toLowerCase();
  return data
    .filter((m) => !needle || m.id.toLowerCase().includes(needle))
    .sort((a, b) => (b.context_length || 0) - (a.context_length || 0));
}

async function chat({ model, messages, maxTokens = 4096, temperature = 0.3 }) {
  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      // OpenRouter asks for these for attribution/rankings; harmless to omit
      // functionally, included for good citizenship.
      "HTTP-Referer": "https://welc-academy.vercel.app",
      "X-Title": "WELC Academy ops tooling",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    console.error(`Request failed: ${res.status} ${JSON.stringify(body)}`);
    process.exit(4);
  }
  return body;
}

function printUsage(model, body) {
  const u = body.usage;
  if (!u) return;
  console.error(
    `\n[${model}] tokens: ${u.prompt_tokens} in / ${u.completion_tokens} out` +
      (u.cost != null ? ` — cost: $${u.cost}` : "")
  );
}

function parseFlags(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--system") flags.system = argv[++i];
    else if (argv[i] === "--file") flags.file = argv[++i];
    else if (argv[i] === "--max-tokens") flags.maxTokens = Number(argv[++i]);
    else positional.push(argv[i]);
  }
  return { flags, positional };
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);

  if (cmd === "models") {
    const [filter] = rest;
    const models = await listModels(filter);
    if (models.length === 0) {
      console.log(`No models found matching "${filter}".`);
      return;
    }
    for (const m of models.slice(0, 25)) {
      const price = m.pricing
        ? `$${(Number(m.pricing.prompt) * 1_000_000).toFixed(2)}/$${(
            Number(m.pricing.completion) * 1_000_000
          ).toFixed(2)} per 1M in/out`
        : "price n/a";
      console.log(`${m.id}\n  context: ${m.context_length}  ${price}\n`);
    }
    return;
  }

  if (cmd === "ask" || cmd === "delegate") {
    const { flags, positional } = parseFlags(rest);
    const [target, promptArg] = positional;
    if (!target) {
      console.error(`Usage: ${cmd} <${cmd === "ask" ? "model-id" : "alias"}> "<prompt>" [--system "..."] [--file path]`);
      process.exit(1);
    }

    let model = target;
    if (cmd === "delegate") {
      const providerPrefix = PROVIDER_ALIASES[target.toLowerCase()];
      if (!providerPrefix) {
        console.error(
          `Unknown alias "${target}". Known: ${Object.keys(PROVIDER_ALIASES).join(", ")}`
        );
        process.exit(1);
      }
      const candidates = await listModels(providerPrefix + "/");
      if (candidates.length === 0) {
        console.error(`No live models found for provider "${providerPrefix}".`);
        process.exit(1);
      }
      model = candidates[0].id;
      console.error(`[delegate] ${target} -> ${model}`);
    }

    let prompt = promptArg;
    if (flags.file) {
      const { readFile } = await import("node:fs/promises");
      prompt = await readFile(flags.file, "utf8");
    }
    if (!prompt) {
      console.error("No prompt given (pass it as an argument or via --file).");
      process.exit(1);
    }

    const messages = [];
    if (flags.system) messages.push({ role: "system", content: flags.system });
    messages.push({ role: "user", content: prompt });

    const body = await chat({ model, messages, maxTokens: flags.maxTokens });
    const answer = body.choices?.[0]?.message?.content ?? "(no content returned)";
    console.log(answer);
    printUsage(model, body);
    return;
  }

  console.log(
    "Usage:\n" +
      "  node ops/llm/openrouter.mjs models <provider-substring>\n" +
      '  node ops/llm/openrouter.mjs ask <model-id> "<prompt>" [--system "..."] [--file path]\n' +
      '  node ops/llm/openrouter.mjs delegate <qwen|deepseek|kimi|grok|gemini> "<prompt>" [--file path]'
  );
}

main().catch((e) => {
  console.error("UNCAUGHT:", e.message);
  process.exit(1);
});
