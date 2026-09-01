// Apply pending SQL migrations via the Supabase Management API.
//
// Usage (from repo root):  node ops/apply-migrations.mjs
//
// Requires SUPABASE_ACCESS_TOKEN (a Supabase Personal Access Token, `sbp_...`,
// from https://supabase.com/dashboard/account/tokens) to be present in the
// environment. Env vars are injected when the session container boots, so add
// the token to the environment config and start a NEW session before running.
//
// Idempotent: every migration is written to be safe to re-run.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const REF = process.env.SUPABASE_PROJECT_REF || "lvrmrwfuoqxthbnkoemt";
const here = dirname(fileURLToPath(import.meta.url));
const FILES = [
  "supabase/migrations/20260831_rpc_hardening.sql",
  "supabase/migrations/20260831_data_rights.sql",
].map((p) => join(here, p));

const token =
  process.env.SUPABASE_ACCESS_TOKEN ||
  process.env.SUPABASE_PAT ||
  process.env.SUPABASE_MANAGEMENT_TOKEN;

if (!token) {
  console.error(
    "MISSING SUPABASE_ACCESS_TOKEN. Add a Supabase Personal Access Token to the\n" +
      "environment (https://supabase.com/dashboard/account/tokens) and start a new session."
  );
  process.exit(2);
}

async function runQuery(sql) {
  return fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
}

async function main() {
  const probe = await runQuery("select 1 as ok;");
  if (!probe.ok) {
    console.error(
      `Token did not authorize (${probe.status}). Check it is a valid Supabase\n` +
        `Personal Access Token and that this session booted after it was added.`
    );
    process.exit(3);
  }
  console.log(`Authorized against project ${REF}.`);

  for (const f of FILES) {
    const sql = readFileSync(f, "utf8");
    const res = await runQuery(sql);
    const body = await res.text();
    if (res.ok) {
      console.log(`APPLIED ✅  ${f.split("/").pop()}`);
    } else {
      console.error(`FAILED ❌  ${f.split("/").pop()}: ${res.status}`);
      console.error(body.slice(0, 600));
      process.exit(4);
    }
  }
  console.log("\nALL MIGRATIONS APPLIED ✅");
}

main().catch((e) => {
  console.error("UNCAUGHT:", e.message);
  process.exit(1);
});
