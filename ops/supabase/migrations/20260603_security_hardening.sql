-- 20260603_security_hardening.sql

-- ── FIX 1: Profiles RLS (scoped: self / owner / teacher-of-student) ──────────
create policy "profiles: self read"
  on profiles for select
  using (id = auth.uid());

create policy "profiles: owner read all"
  on profiles for select
  using (auth_user_role() = 'owner');

create policy "profiles: teacher reads own students"
  on profiles for select
  using (
    auth_user_role() = 'teacher'
    and id in (
      select c2.student_id from commitments c2
      join class_sessions cs on cs.id = c2.session_id
      join classes cl on cl.id = cs.class_id
      where cl.teacher_id = auth.uid()
    )
  );

create policy "profiles: self update"
  on profiles for update
  using (id = auth.uid());

-- ── FIX 2: Classes RLS ───────────────────────────────────────────────────────
create policy "classes: owner full access"
  on classes for all
  using (auth_user_role() = 'owner')
  with check (auth_user_role() = 'owner' and created_by = auth.uid());

create policy "classes: teacher reads own"
  on classes for select
  using (teacher_id = auth.uid());

create policy "classes: student reads all"
  on classes for select
  using (auth_user_role() = 'student');

-- ── FIX 3: Sessions RLS — revoke direct writes on sensitive columns ──────────
-- Revoke all UPDATE on class_sessions from client roles. Status/timing columns
-- (status, started_at, ended_at, actual_minutes) must only be changed through
-- the security-definer RPCs below, never written directly by clients. The
-- meeting link lives on the `classes` table, not here.
revoke update on class_sessions from authenticated;

create policy "sessions: visible to all authenticated"
  on class_sessions for select
  using (auth.uid() is not null);

create policy "sessions: owner can insert/delete"
  on class_sessions for insert
  with check (auth_user_role() = 'owner');

-- ── FIX 4: Secure RPCs for session state changes ────────────────────────────
-- Teachers call these instead of writing to class_sessions directly

create or replace function rpc_start_session(p_session_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_teacher_id uuid;
begin
  select cl.teacher_id into v_teacher_id
  from class_sessions cs
  join classes cl on cl.id = cs.class_id
  where cs.id = p_session_id;

  if v_teacher_id <> auth.uid() then
    raise exception 'Not your session';
  end if;

  update class_sessions
  set status = 'in_progress', started_at = now()
  where id = p_session_id and status = 'scheduled';
end;
$$;

create or replace function rpc_end_session(p_session_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_teacher_id uuid;
  v_started_at timestamptz;
begin
  select cl.teacher_id, cs.started_at into v_teacher_id, v_started_at
  from class_sessions cs
  join classes cl on cl.id = cs.class_id
  where cs.id = p_session_id;

  if v_teacher_id <> auth.uid() then
    raise exception 'Not your session';
  end if;

  update class_sessions
  set
    status = 'completed',
    ended_at = now(),
    actual_minutes = extract(epoch from (now() - v_started_at))::int / 60
  where id = p_session_id and status = 'in_progress';
end;
$$;

-- ── FIX 5: DB-enforced commitment windows ────────────────────────────────────
-- Must match constants.ts: COMMIT_CUTOFF_HOURS=1, UNCOMMIT_CUTOFF_HOURS=2
create or replace function enforce_commitment_window()
returns trigger language plpgsql as $$
declare
  v_scheduled_at timestamptz;
begin
  select scheduled_at into v_scheduled_at
  from class_sessions where id = new.session_id;

  if TG_OP = 'INSERT' and v_scheduled_at - now() < interval '1 hour' then
    raise exception 'Too late to commit (cutoff: 1 hour before)';
  end if;

  if TG_OP = 'UPDATE' and new.status = 'uncommitted'
     and v_scheduled_at - now() < interval '2 hours' then
    raise exception 'Too late to uncommit (cutoff: 2 hours before)';
  end if;

  return new;
end;
$$;

create trigger commitment_window_check
  before insert or update on commitments
  for each row execute procedure enforce_commitment_window();

-- ── FIX 6: Commitments RLS ──────────────────────────────────────────────────
create policy "commitments: student manages own"
  on commitments for all
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy "commitments: teacher reads for own sessions"
  on commitments for select
  using (
    session_id in (
      select cs.id from class_sessions cs
      join classes cl on cl.id = cs.class_id
      where cl.teacher_id = auth.uid()
    )
  );

create policy "commitments: owner reads all"
  on commitments for select
  using (auth_user_role() = 'owner');

-- ── FIX 7: Attendance RLS ───────────────────────────────────────────────────
create policy "attendance: student reads own"
  on attendance for select
  using (student_id = auth.uid());

create policy "attendance: teacher manages for own sessions"
  on attendance for all
  using (
    session_id in (
      select cs.id from class_sessions cs
      join classes cl on cl.id = cs.class_id
      where cl.teacher_id = auth.uid()
    )
  );

create policy "attendance: owner full access"
  on attendance for all
  using (auth_user_role() = 'owner');

-- ── FIX 8: Notifications RLS ────────────────────────────────────────────────
create policy "notifications: own only"
  on notifications for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
