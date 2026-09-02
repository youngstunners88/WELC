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

**A plan upgrade is currently off the table (budget).** So the two gaps it
would have closed are handled separately below — one is fully solved, the
other is mitigated but not eliminated.

| Gap | Status without a paid plan |
|---|---|
| Leaked-password protection (was HTTP 402) | **Fully solved in the app.** `src/lib/security/pwned-password.ts` checks new passwords against Have I Been Pwned's free range API using k-anonymity, enforced in the signup action. Same protection Supabase sells. |
| Managed backups / PITR | **Mitigated, not solved.** Scheduled encrypted export, below. Real PITR is not reproducible without the platform. |

## Automated encrypted backup (the workaround in place)

`.github/workflows/backup.yml` runs daily at 03:00 Asia/Seoul (and on demand
from the Actions tab). It exports every public table, verifies the export is
non-empty, encrypts it with AES-256, and uploads it as a 90-day artifact.

**This repository is public, so workflow artifacts are publicly
downloadable.** That is exactly why the archive is encrypted on the runner
before upload — the artifact is useless without the passphrase. The workflow
refuses to upload anything if `BACKUP_PASSPHRASE` is missing. Never remove
that step while the repo is public.

### One-time setup (required — the workflow fails without it)

In GitHub → Settings → Secrets and variables → Actions, add:

| Secret | Value |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | A Supabase personal access token (`sbp_…`) from https://supabase.com/dashboard/account/tokens |
| `BACKUP_PASSPHRASE` | A long random passphrase — 6+ random words. **Write it down somewhere physical.** If it is lost, every backup is permanently unreadable. |

### Restoring from a backup

Download the artifact from the Actions run, then:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 250000 \
  -in backup.tar.gz.enc -out backup.tar.gz
tar xzf backup.tar.gz
```

Verified end to end: the decrypted archive is bit-identical to the original
(SHA-256 match), and a wrong passphrase fails closed with `bad decrypt`.

Then follow the rebuild procedure below to load the JSON back in.

### What this buys you, stated plainly

| | Daily encrypted export | Real PITR (unavailable) |
|---|---|---|
| Worst-case data loss | **Up to 24 hours** | Seconds |
| Time to restore | **1–2 hours, manual** | Minutes |
| Covers accidental deletion | Yes (up to 24h old) | Yes |
| Covers `auth.users` | **No** | Yes |

`auth.users` is deliberately excluded. It holds password hashes for accounts
belonging to minors; putting those in a downloadable artifact — even an
encrypted one — is a worse risk than the inconvenience it avoids. The
consequence is real and must be understood: **after a full disaster, every
user has to sign up again.** At the current size that is minutes of work; if
the academy grows to hundreds of students, revisit this trade-off.

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
