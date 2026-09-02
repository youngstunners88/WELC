# WELC Academy — working notes for Claude

Class scheduling, attendance, teacher payroll hours and academy messaging for a
single English academy in Korea (위준성 영어 라이프 컨설팅). Next.js 14 App
Router + Supabase (Postgres, Auth, Storage, Realtime), deployed on Vercel.

## Ground rules specific to this codebase

**The database is the authority, not the app.** Every table has RLS. Privileged
operations go through `SECURITY DEFINER` RPCs that check `auth_user_role()`
internally. App-layer guards (`requireRole`, `requireRoleAction`) are
defence-in-depth, never the only check. When adding a privileged operation,
add the DB-side check first — an app-only guard is not a guard.

**Three roles, and one hard product rule.** `owner`, `teacher`, `student`.
The owner may message anyone; members may reply to the owner; **members must
never be able to message each other**. This is an explicit requirement from
the academy owner, not an implementation detail. Anything that leaks a
teacher's contact details to students (e.g. `profiles.email` / `.phone`)
violates the spirit of it — see `rpc_teacher_names` for the pattern to follow
when a student needs a teacher's *name* only.

**Signup can never escalate.** `handle_new_user()` hard-codes `role='student'`
and validates `requested_role` against `('teacher','student')`. A teacher
request parks as `status='pending'` until an owner approves.

## Things that have actually broken here (do not repeat)

- **CSP without a nonce killed the entire site.** A static `script-src 'self'`
  in `next.config.mjs` blocked the App Router's inline hydration scripts. Pages
  rendered perfectly and *nothing was clickable anywhere*. CSP is now built
  per-request with a nonce in `src/middleware.ts`. Never move it back to a
  static header.
- **A hardcoded CORS origin 403'd every API call** on Vercel preview/branch
  domains. `isAllowedOrigin` now always permits same-origin.
- **Aggressive rate limits locked real users out silently.** Login/signup
  guards reject *before* reaching Supabase, so nothing appears in Supabase auth
  logs — check `src/app/(auth)/login/actions.ts` before assuming auth is broken.
- **Invisible Unicode in a regex.** `src/lib/ai/sanitize.ts` builds its
  character class from a string of `\uXXXX` escapes on purpose; test fixtures
  use `String.fromCodePoint`. Never type these code points as literal glyphs —
  they silently become real invisible characters in source.

## Layout

```
src/app/(auth)/       login + signup (server actions)
src/app/(dashboard)/  owner/, teacher/, student/, settings/, messages/
src/app/api/          route handlers (AI chat)
src/lib/              pure logic — testable without Next.js
  ai/                 assistant tools + input sanitising
  supabase/           server + browser clients
  security-headers.ts CORS + CSP (unit-tested)
  rate-limit.ts       in-memory limiter (unit-tested)
ops/supabase/migrations/  ordered SQL; the schema's source of truth
ops/llm/              OpenRouter multi-model delegation tooling
```

Pure logic belongs in `src/lib/**` so it can be unit-tested; route handlers and
server actions should stay thin wiring over it. When something in a route is
worth testing, extract it first (see `sanitize.ts`, `security-headers.ts`).

## Commands

```bash
npm run dev          npm test          # vitest
npm run lint         npm run type-check
npx next build
node ops/apply-migrations.mjs          # applies pending SQL via Management API
node ops/llm/openrouter.mjs models qwen
```

Migrations are applied through the Supabase Management API using
`SUPABASE_ACCESS_TOKEN`. Env vars are injected at container boot — a key added
mid-session is invisible until a new session starts.

## Verify before you believe

Model-reported "vulnerabilities" in this repo have been majority false
positives. Before acting on any finding, read the whole function and check the
*deployed* definition (`pg_get_functiondef`) — several reported issues were
already guarded. Fix what you can prove; say so plainly when you cannot.
