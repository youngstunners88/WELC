#!/usr/bin/env node
// ops/backup-database.mjs
//
// Exports every row of every public table to timestamped JSON.
//
// WHY THIS EXISTS: the Supabase project is on a plan with no restorable
// backup. `GET /v1/projects/<ref>/database/backups` returns
// `{"pitr_enabled": false, "backups": []}` — there is no point-in-time
// recovery and no stored snapshot. If this database is lost, corrupted, or
// someone deletes a term's attendance by mistake, there is nothing to restore
// from. That is an unacceptable position for records that feed teacher payroll.
//
// This is a stopgap, NOT a replacement for managed backups. It is a logical
// export (rows only) — it does not capture schema, policies, functions, auth
// users, or storage objects. Schema lives in ops/supabase/migrations/, so a
// full rebuild = re-run migrations, then re-import these rows. Auth users are
// NOT covered; a full disaster would still require users to sign up again.
//
// The real fix is a Supabase plan with daily backups + PITR. Until then, run
// this on a schedule and keep the output somewhere off Supabase.
//
// Usage:
//   node ops/backup-database.mjs [output-dir]
// Requires SUPABASE_ACCESS_TOKEN.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REF = process.env.SUPABASE_PROJECT_REF || "lvrmrwfuoqxthbnkoemt";
const TOKEN =
  process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_PAT;

if (!TOKEN) {
  console.error(
    "Missing SUPABASE_ACCESS_TOKEN. Generate one at\n" +
      "https://supabase.com/dashboard/account/tokens and add it to the environment."
  );
  process.exit(2);
}

async function query(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  if (!res.ok) {
    throw new Error(`Query failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  return res.json();
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = process.argv[2] || join("backups", stamp);
  mkdirSync(outDir, { recursive: true });

  const tables = await query(`
    select c.relname as name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by c.relname;
  `);

  const manifest = {
    project_ref: REF,
    taken_at: new Date().toISOString(),
    note: "Logical row export. Schema is in ops/supabase/migrations/. Auth users and storage objects are NOT included.",
    tables: {},
  };

  let total = 0;
  for (const { name } of tables) {
    // Identifiers come from pg_class, not user input, so interpolation here is
    // safe — but quote them anyway so unusual names don't break the statement.
    const rows = await query(`select * from "${name}";`);
    writeFileSync(
      join(outDir, `${name}.json`),
      JSON.stringify(rows, null, 2),
      "utf8"
    );
    manifest.tables[name] = rows.length;
    total += rows.length;
    console.log(`  ${name}: ${rows.length} rows`);
  }

  writeFileSync(
    join(outDir, "_manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );

  console.log(
    `\nBacked up ${Object.keys(manifest.tables).length} tables, ${total} rows -> ${outDir}`
  );
  console.log(
    "Reminder: this contains students' personal data. Store it somewhere access-controlled; do not commit it."
  );
}

main().catch((e) => {
  console.error("Backup failed:", e.message);
  process.exit(1);
});
