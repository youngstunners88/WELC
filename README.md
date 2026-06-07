# WELC Academy

**위준성 영어 라이프 컨설팅 (Wejoonseong English Life Consulting)** — a scheduling,
attendance, and teacher-hours platform that replaces Kakao/WhatsApp group chats with
a single place for class scheduling, student commitment tracking, live attendance
marking, and teacher-hours reporting.

Built for an academy coaching flight-attendant candidates on English interviews.

## Stack

- **Next.js 14** (App Router, Server Components, Server Actions) · TypeScript (strict)
- **Supabase** — PostgreSQL 16 + Auth + Realtime, with Row-Level Security as the perimeter
- **Tailwind CSS** + lightweight shadcn-style UI · Recharts · Zod · date-fns · lucide-react
- **i18n** — Korean default, English toggle (cookie-based)
- **Deploy** — Vercel, region `icn1` (Seoul/Incheon)

## Roles

| Role | Can do |
|------|--------|
| **Owner** (원장) | Dashboard metrics, create classes, view teacher hours & student attendance |
| **Teacher** (강사) | See today's sessions, start/end a class, mark attendance |
| **Student** (학생) | Browse classes, commit/uncommit to sessions, view attendance history |

## Local setup

```bash
npm install
cp .env.example .env.local      # fill in your Supabase URL + anon key
npm run dev                     # http://localhost:3000
npm run type-check              # must be 0 errors
npm run build                   # production build
```

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database

Apply the four migrations **in order** in the Supabase SQL editor — each depends on the previous:

1. `ops/supabase/migrations/20260601_initial_schema.sql`
2. `ops/supabase/migrations/20260602_analytics_views.sql`
3. `ops/supabase/migrations/20260603_security_hardening.sql`
4. `ops/supabase/migrations/20260604_lock_maintenance_exec.sql`

Then, in **Authentication → Providers → Email**, turn off "Confirm email" for the MVP demo.

### First owner account

1. Sign up at `/login` (the DB trigger always creates a `student`).
2. In Supabase → Table Editor → `profiles`, change that row's `role` to `owner`.
3. Log in again → you land on `/owner`.

## Security model

The database is the perimeter. Every integrity-critical rule is enforced in SQL, not just the UI:

- **RLS** on every table — students see only their own data.
- **Role on signup is always `student`** (DB trigger); elevation is manual.
- **Session minutes & status** are computed by `rpc_start_session` / `rpc_end_session` — teachers cannot write those columns directly.
- **Commitment windows** (1h commit / 2h uncommit cutoffs) are enforced by a DB trigger.
- **Meeting links** are validated by a Zod schema, a DB `CHECK`, and a `safeUrl()` render guard.
- Only the anon key is used client-side; the service-role key never appears in app code.

## Deployment (Vercel)

1. Import this repo in Vercel (framework auto-detected as Next.js).
2. Set the three env vars above for Production, Preview, and Development.
3. Deploy. The `icn1` region is pinned in `vercel.json`.
