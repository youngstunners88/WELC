---
name: multi-model
description: Delegate a task to a specific non-Claude frontier model (Qwen, DeepSeek, Kimi/Moonshot, Grok, Gemini, or any other model OpenRouter carries) via OpenRouter, or list current model ids/pricing for a provider. Use when the user asks to get a second opinion from another model, wants a task split across multiple providers, or names one of these providers directly.
metadata:
  author: welc-ops
---

# Multi-Model Delegation

Calls other providers' models through OpenRouter's unified API, for splitting
work across models rather than doing everything as Claude — a second opinion
on a security-sensitive diff, a large-context read a cheaper model handles
fine, a fast pass at boilerplate.

## Prerequisite

`OPENROUTER_API_KEY` must be set in the environment (get one at
https://openrouter.ai/keys). Env vars are read once at session start, so a
key added mid-session isn't visible until a new session begins — if a call
fails with a missing-key error, that's the reason, not a broken script.

## Commands

All run from the repo root via `node ops/llm/openrouter.mjs <command>`.

**List current models for a provider** (no API key needed — always check
this before hardcoding a model id, since exact ids/pricing change over time):

```
node ops/llm/openrouter.mjs models qwen
node ops/llm/openrouter.mjs models deepseek
node ops/llm/openrouter.mjs models moonshotai   # Kimi
node ops/llm/openrouter.mjs models x-ai         # Grok
node ops/llm/openrouter.mjs models google       # Gemini
```

**Ask one exact model** (preferred — predictable, you picked the id from a
live list):

```
node ops/llm/openrouter.mjs ask "deepseek/deepseek-v4-flash-latest" "review this diff for injection risks: ..." --system "You are a terse security reviewer."
node ops/llm/openrouter.mjs ask "google/gemini-3.7-flash" "..." --file /path/to/long-context-input.txt
```

**Delegate by short alias** (convenience only — picks that provider's
highest-context model, which is a rough proxy for "flagship" and can pick a
fast/cheap variant instead of the strongest reasoning model; prefer `ask`
with an exact id for anything that matters):

```
node ops/llm/openrouter.mjs delegate qwen "..."
node ops/llm/openrouter.mjs delegate kimi "..."
node ops/llm/openrouter.mjs delegate grok "..."
```

Aliases: `qwen`, `deepseek`, `kimi` (or `moonshot`), `grok` (or `xai`),
`gemini` (or `google`), `claude` (or `anthropic`).

## Cost visibility

Every call prints token usage and cost to stderr after the response, e.g.
`[deepseek/deepseek-v4-flash-latest] tokens: 812 in / 340 out — cost: $0.0009`.
This still runs without a manual approval per call (that's the point of the
skill), but the spend stays visible in the transcript rather than silent.

## When to actually use this vs. just doing the task directly

Reach for delegation when a task genuinely benefits from a different model —
independent verification, a provider's specific strength (huge context, a
reasoning mode, cost for a bulk/repetitive pass), or the user explicitly asks
for another model's take. Don't delegate reflexively: splitting a task across
providers adds coordination overhead and real cost, and most of what
lands here is well within reach directly.
