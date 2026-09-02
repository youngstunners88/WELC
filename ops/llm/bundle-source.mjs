#!/usr/bin/env node
// ops/llm/bundle-source.mjs
//
// Concatenate the security-critical parts of the app into one text bundle for
// an external model to audit. Keeps the bundle in a file rather than routing
// it through the orchestrating agent's context.
//
// Usage: node ops/llm/bundle-source.mjs <output-file> [--all]
//   default: middleware, auth actions, API routes, lib, SQL migrations
//   --all:   additionally include every page/component under src/app

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const out = process.argv[2];
const includeAll = process.argv.includes("--all");

if (!out) {
  console.error("Usage: node ops/llm/bundle-source.mjs <output-file> [--all]");
  process.exit(1);
}

const SEED_DIRS = ["src/lib", "src/app/api", "ops/supabase/migrations"];
const SEED_FILES = [
  "src/middleware.ts",
  "next.config.mjs",
  "src/app/(auth)/login/actions.ts",
  "src/app/auth/callback/route.ts",
  "src/app/(dashboard)/settings/actions.ts",
];
const EXT = /\.(ts|tsx|mjs|sql)$/;
const SKIP = /node_modules|\.next|\.test\./;

function walk(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(join(ROOT, dir));
  } catch {
    return acc;
  }
  for (const e of entries) {
    const rel = join(dir, e);
    if (SKIP.test(rel)) continue;
    const st = statSync(join(ROOT, rel));
    if (st.isDirectory()) walk(rel, acc);
    else if (EXT.test(rel)) acc.push(rel);
  }
  return acc;
}

const files = new Set();
for (const f of SEED_FILES) files.add(f);
for (const d of SEED_DIRS) for (const f of walk(d)) files.add(f);
if (includeAll) for (const f of walk("src/app")) files.add(f);

const parts = [];
let bytes = 0;
for (const f of [...files].sort()) {
  let content;
  try {
    content = readFileSync(join(ROOT, f), "utf8");
  } catch {
    continue;
  }
  bytes += content.length;
  parts.push(`\n===== FILE: ${relative(ROOT, f)} =====\n${content}`);
}

writeFileSync(out, parts.join("\n"), "utf8");
console.error(
  `Bundled ${files.size} files, ${(bytes / 1024).toFixed(0)} KB -> ${out}`
);
