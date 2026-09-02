# WELC Academy — Security Audit & Hardening

Audit date: 2026-06-08. Scope: server actions, middleware, RLS, storage, role model.

## Model

Three roles — `owner`, `teacher`, `student` — enforced at **two layers**:

1. **Database (authoritative):** Row-Level Security on every table; privileged
   operations routed through `SECURITY DEFINER` RPCs that check
   `auth_user_role()`; column-level grants so a user can only update their own
   `full_name` / `phone` (never `role` / `status`).
2. **Application (defense-in-depth):** route guards + server-action guards added
   in this pass so wrong-role users can't even render or invoke privileged code.

## Findings & resolutions

| # | Finding | Severity | Resolution |
|---|---------|----------|------------|
| 1 | Middleware only checked auth, not role — any logged-in user could navigate to `/owner/*` | Medium | Added per-segment server guards (`requireRole`) in `owner/`, `teacher/`, `student/` layouts that redirect wrong-role users. Data was already blocked by RLS. |
| 2 | `deleteMaterial` had no identity check (pure IDOR reliance on RLS) | Low | Now verifies auth + class ownership before delete. |
| 3 | `addLinkMaterial` / `addFileMaterial` didn't verify the caller teaches the target class | Low | Added `canManageClass` ownership check. |
| 4 | `setUserRole` / `rejectTeacher` / `createClass` didn't pre-check owner role | Low | Added `requireRoleAction(["owner"])` (RPC/RLS still re-check). |
| 5 | `uncommitFromSession` updated by id without owner filter | Low | Now scoped `.eq("student_id", user.id)`. |
| 6 | `markAttendance` had no identity/role check | Low | Added `requireRoleAction(["owner","teacher"])` + mark validation. |
| 7 | File uploads had no size/type limit | Low | Client-side 25 MB cap + allowlist of non-executable extensions. |
| 8 | Role / mark / new-role values not validated server-side | Low | Added enum validation in the relevant actions. |

## Verified secure (no change needed)

- `handle_new_user()` always assigns `role = 'student'`; `requested_role` from
  signup metadata can never escalate privilege.
- All `SECURITY DEFINER` functions check the caller's role or have EXECUTE
  revoked (`send_session_reminders`).
- All analytics views use `security_invoker` → underlying RLS applies.
- Commitment / uncommit timing enforced by DB triggers, not just the client.
- `safeUrl()` blocks `javascript:` and other non-http(s) hrefs.

## Known dependency vulnerabilities (tracked, not yet resolved)

`npm audit` (2026-09-01): `next@14.2.35` carries multiple high-severity
advisories (SSRF via rewrites, unauthenticated Server Function endpoint
disclosure, cache-poisoning and DoS variants — see `npm audit` for the full
GHSA list). The only fix is a major upgrade to `next@16.3.4` (14 → 16, no 15
in between), which is a breaking change for an App Router + middleware-heavy
app like this one — not something to apply blind given how much this app's
behavior has depended on exact framework behavior (see the CSP/hydration
incident: a single header change made the entire site non-interactive).
CI now runs `npm audit --audit-level=high` on every push as `continue-on-error`
so this stays visible without blocking merges until the upgrade is
deliberately planned, tested end-to-end (especially middleware, Server
Actions, and the nonce-based CSP), and shipped as its own change.

## Accepted residual risk

- **`class-materials` is a public-read bucket.** Anyone with a file's full URL
  can read it. Paths are randomized (`<classId>/<uuid>-<name>`), so they are not
  enumerable, and the content is non-sensitive course material. If stricter
  control is ever needed, switch the student/teacher pages from public URLs to
  short-lived signed URLs (`createSignedUrl`) and set the bucket `public = false`.
