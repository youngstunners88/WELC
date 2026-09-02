# Backup & recovery posture

Last verified: 2 September 2026, against the live Supabase project.

## The current position — read this first

```
GET /v1/projects/<ref>/database/backups
{ "pitr_enabled": false, "walg_enabled": true, "backups": [] }
```

**There is no restorable managed backup.** No point-in-time recovery, and the
stored-backup list is empty. If the database is lost, corrupted, or a term's
attendance is deleted by mistake, Supabase has nothing to roll back to.

That matters more than usual here, because these tables feed **teacher payroll**
(`class_sessions.actual_minutes`) and **attendance records** that parents rely
on. Losing them is not an inconvenience; it is a dispute with staff and
customers and no evidence to settle it.

## What closes this properly

Upgrade the Supabase project to a plan that includes daily backups and PITR.
On the current plan the managed-backup APIs are unavailable — the same plan
gate also blocks leaked-password (HIBP) protection, which returns HTTP 402.
One plan change resolves both.

## The stopgap that exists today

`ops/backup-database.mjs` exports every row of every public table to
timestamped JSON.

```bash
node ops/backup-database.mjs              # -> backups/<timestamp>/
node ops/backup-database.mjs /some/path   # explicit destination
```

Requires `SUPABASE_ACCESS_TOKEN`. Verified working: 13 tables exported.

### What it covers, and what it does not

| Covered | Not covered |
|---|---|
| All rows in all `public` tables | `auth.users` — accounts and passwords |
| Table-by-table JSON + a manifest with row counts | Storage objects (uploaded class materials) |
| | Schema, RLS policies, functions, grants |

Schema is not a gap in practice — it lives in `ops/supabase/migrations/` and is
replayable. Auth users and storage objects **are** real gaps: a full disaster
would still require every user to sign up again, and uploaded materials would
be gone.

### Restore procedure (rebuild from zero)

1. Create a new Supabase project.
2. Apply every migration in `ops/supabase/migrations/` in filename order
   (`node ops/apply-migrations.mjs`, or paste them in the SQL editor).
3. Re-create the owner account, then promote it (`update profiles set
   role='owner' where email=...`).
4. Import the JSON exports table-by-table, respecting foreign-key order:
   `profiles` → `classes` → `class_sessions` → `commitments` → `attendance` →
   everything else.
5. Point `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` at the new project and
   redeploy.

**This procedure has not been rehearsed.** A restore plan nobody has executed
is a hypothesis, not a plan. It should be tested against a throwaway project
before it is ever needed.

## Also noted

The Postgres version is upgradeable (`17.6.1.127` → `17.6.1.166`, GA channel,
eligible, no blocking validation errors, ~1 hour estimated). Low priority, but
it should not be left indefinitely.
