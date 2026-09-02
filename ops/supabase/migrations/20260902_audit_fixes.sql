-- 20260902_audit_fixes.sql
-- Fixes from the multi-model audit pass (only findings independently verified
-- against the live database — the majority of model-reported "vulnerabilities"
-- were false positives and are deliberately not acted on here).

-- ── 1. Students could not see their teacher's name ──────────────────────────
-- profiles RLS has policies for: self, owner-reads-all, teacher-reads-own-
-- students, teacher-reads-referred-students. There is NO policy letting a
-- student read a teacher's row. But the student classes page and the AI
-- assistant both join `profiles` for the teacher's full_name, so that join
-- silently returned null — teacher names rendered blank.
--
-- The obvious fix (a policy allowing anyone to read teacher/owner rows) is
-- wrong here: `authenticated` holds column SELECT grants on profiles.email
-- and profiles.phone, so it would hand every student every teacher's contact
-- details — directly against the academy owner's requirement that students
-- not be able to contact teachers outside the platform.
--
-- Instead: a SECURITY DEFINER lookup that returns ONLY id + full_name, never
-- contact columns. Consistent with how the rest of this schema exposes
-- privileged reads.
create or replace function rpc_teacher_names(p_ids uuid[])
returns table(id uuid, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name
  from profiles p
  where p.id = any(p_ids)
    and p.role in ('teacher', 'owner');
$$;

revoke execute on function rpc_teacher_names(uuid[]) from public, anon;
grant  execute on function rpc_teacher_names(uuid[]) to authenticated;

-- ── 2. Students could read materials for classes they aren't enrolled in ────
-- "materials: students read" was `using (auth_user_role() = 'student')` — i.e.
-- every student could read every class's materials, including classes they
-- have never joined. Scope it to classes the student actually has a
-- commitment against. (Class and session rows stay broadly readable on
-- purpose: students browse the catalogue to pick sessions to commit to.)
drop policy if exists "materials: students read" on materials;
create policy "materials: students read enrolled" on materials for select
  using (
    auth_user_role() = 'student'
    and class_id in (
      select cs.class_id
      from commitments c
      join class_sessions cs on cs.id = c.session_id
      where c.student_id = auth.uid()
    )
  );
