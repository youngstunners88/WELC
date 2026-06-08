-- 20260607_hours_and_referrals.sql
-- Two product upgrades:
--   1) Let teachers LOG a past session (so retroactively-added classes count
--      toward teaching hours, instead of being stuck at 0.0).
--   2) Teacher REFERRAL links: a student who signs up via a teacher's link is
--      attributed to that teacher (profiles.referred_by).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. rpc_log_session — mark a session complete with an explicit duration.
--    Teacher-owns-session check; usable for past 'scheduled' sessions that were
--    taught but never run through the live Start→End flow. The direct-write
--    revoke on class_sessions (migration 20260603) still stands; this RPC is the
--    only sanctioned path, same pattern as rpc_start_session / rpc_end_session.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function rpc_log_session(p_session_id uuid, p_minutes int)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_teacher_id uuid;
  v_scheduled_at timestamptz;
  v_status text;
begin
  select cl.teacher_id, cs.scheduled_at, cs.status
    into v_teacher_id, v_scheduled_at, v_status
  from class_sessions cs
  join classes cl on cl.id = cs.class_id
  where cs.id = p_session_id;

  if v_teacher_id is null then
    raise exception 'Session not found';
  end if;
  if v_teacher_id <> auth.uid() then
    raise exception 'Not your session';
  end if;
  if v_status = 'completed' then
    raise exception 'Session already logged';
  end if;
  if p_minutes is null or p_minutes <= 0 or p_minutes > 600 then
    raise exception 'Duration must be between 1 and 600 minutes';
  end if;

  update class_sessions
  set
    status = 'completed',
    started_at = coalesce(started_at, v_scheduled_at),
    ended_at = coalesce(v_scheduled_at, now()) + make_interval(mins => p_minutes),
    actual_minutes = p_minutes
  where id = p_session_id;
end;
$$;

revoke execute on function rpc_log_session(uuid, int) from public, anon;
grant execute on function rpc_log_session(uuid, int) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Teacher referral attribution.
-- ─────────────────────────────────────────────────────────────────────────────
alter table profiles
  add column if not exists referred_by uuid references profiles(id);

-- Re-create the signup trigger to also capture a referring teacher id passed in
-- user metadata as `referred_by`. The id is only honoured if it belongs to an
-- actual teacher/owner, so a bogus value can't poison attribution.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_requested text := coalesce(new.raw_user_meta_data->>'requested_role','student');
  v_ref uuid;
  v_ref_ok uuid;
begin
  if v_requested not in ('teacher','student') then
    v_requested := 'student';
  end if;

  begin
    v_ref := nullif(new.raw_user_meta_data->>'referred_by','')::uuid;
  exception when others then
    v_ref := null;
  end;

  if v_ref is not null then
    select id into v_ref_ok from profiles
    where id = v_ref and role in ('teacher','owner');
  end if;

  insert into profiles (id, email, full_name, role, requested_role, status, referred_by)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    'student',
    v_requested,
    case when v_requested = 'teacher' then 'pending' else 'active' end,
    v_ref_ok
  );
  return new;
end;
$$;

-- Read-only view: each teacher and the students attributed to them, with that
-- student's overall attendance. Powers the teacher's "My students" panel and
-- the owner's attribution column. security_invoker so RLS still applies.
create or replace view v_teacher_students
with (security_invoker = on) as
select
  s.referred_by               as teacher_id,
  s.id                        as student_id,
  s.full_name                 as student_name,
  s.email                     as student_email,
  s.created_at                as joined_at,
  coalesce(va.attended, 0)    as attended,
  coalesce(va.total, 0)       as total,
  va.attendance_rate
from profiles s
left join v_student_attendance va on va.student_id = s.id
where s.referred_by is not null
  and s.role = 'student';
