-- 20260605_v2_features.sql
-- v2: role-at-signup + owner approval, consolidated attendance, class materials,
-- automated-reminder function, and security hardening of self-update + views.

set check_function_bodies = off;

-- ── Feature 1: role selection at signup, with owner approval ─────────────────
alter table profiles
  add column if not exists requested_role text
    check (requested_role in ('teacher','student')),
  add column if not exists status text not null default 'active'
    check (status in ('active','pending'));

-- Capture the role the user asked for at signup. The EFFECTIVE role always
-- starts as 'student' (no privilege from self-declaration); a teacher request
-- is parked as status='pending' until an owner approves it.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_requested text := coalesce(new.raw_user_meta_data->>'requested_role','student');
begin
  if v_requested not in ('teacher','student') then
    v_requested := 'student';
  end if;
  insert into profiles (id, email, full_name, role, requested_role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    'student',
    v_requested,
    case when v_requested = 'teacher' then 'pending' else 'active' end
  );
  return new;
end;
$$;

-- Owner sets a role (also used to APPROVE a pending teacher). Clears pending.
create or replace function set_user_role(target_user_id uuid, new_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth_user_role() <> 'owner' then
    raise exception 'Only owners can set roles';
  end if;
  if new_role not in ('owner','teacher','student') then
    raise exception 'Invalid role';
  end if;
  update profiles
    set role = new_role, status = 'active', updated_at = now()
  where id = target_user_id;
end;
$$;

-- Owner denies a pending teacher request: the account stays a student.
create or replace function reject_teacher_request(target_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth_user_role() <> 'owner' then
    raise exception 'Only owners can reject requests';
  end if;
  update profiles
    set role = 'student', requested_role = 'student',
        status = 'active', updated_at = now()
  where id = target_user_id;
end;
$$;

-- SECURITY FIX: the self-update policy had no column restriction, so a client
-- could update their own row's `role`. Lock writes to name/phone only; role and
-- status change exclusively through the security-definer RPCs above.
revoke update on profiles from authenticated;
grant update (full_name, phone) on profiles to authenticated;

-- ── Feature 2: consolidated per-session attendance, + view hardening ─────────
create or replace view v_session_attendance
with (security_invoker = on) as
select
  cs.id            as session_id,
  cs.class_id,
  cl.name          as class_name,
  cl.level,
  cl.teacher_id,
  tp.full_name     as teacher_name,
  cs.session_number,
  cs.scheduled_at,
  cs.status,
  cs.actual_minutes,
  count(distinct c.student_id)
    filter (where c.status in ('committed','attended'))      as committed,
  count(distinct a.student_id) filter (where a.mark = 'present') as present,
  count(distinct a.student_id) filter (where a.mark = 'late')    as late,
  count(distinct a.student_id) filter (where a.mark = 'missed')  as missed
from class_sessions cs
join classes cl on cl.id = cs.class_id
left join profiles tp on tp.id = cl.teacher_id
left join commitments c on c.session_id = cs.id
left join attendance a on a.session_id = cs.id
group by cs.id, cl.name, cl.level, cl.teacher_id, tp.full_name;

grant select on v_session_attendance to authenticated;

-- Postgres 15 defaults views to bypass the base tables' RLS. Force them to run
-- with the querying user's privileges so a student can't read the whole
-- academy's analytics by hitting the view directly.
alter view v_student_attendance    set (security_invoker = on);
alter view v_teacher_hours_monthly set (security_invoker = on);
alter view v_daily_attendance      set (security_invoker = on);

-- ── Feature 3: class materials (files + links) ──────────────────────────────
create table if not exists materials (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references classes(id) on delete cascade,
  uploaded_by  uuid not null references profiles(id),
  title        text not null,
  kind         text not null check (kind in ('file','link')),
  storage_path text,
  url          text check (url is null or url ~* '^https?://'),
  created_at   timestamptz default now()
);
alter table materials enable row level security;

create policy "materials: owner full access"
  on materials for all
  using (auth_user_role() = 'owner')
  with check (auth_user_role() = 'owner');

create policy "materials: teacher manages own class"
  on materials for all
  using (class_id in (select id from classes where teacher_id = auth.uid()))
  with check (class_id in (select id from classes where teacher_id = auth.uid()));

create policy "materials: students read"
  on materials for select
  using (auth_user_role() = 'student');

-- Public-read bucket for the actual files; uploads/edits restricted by policy.
insert into storage.buckets (id, name, public)
values ('class-materials', 'class-materials', true)
on conflict (id) do nothing;

create policy "class-materials read"
  on storage.objects for select
  using (bucket_id = 'class-materials');

create policy "class-materials write (teacher/owner)"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'class-materials' and auth_user_role() in ('teacher','owner'));

create policy "class-materials update (teacher/owner)"
  on storage.objects for update to authenticated
  using (bucket_id = 'class-materials' and auth_user_role() in ('teacher','owner'));

create policy "class-materials delete (teacher/owner)"
  on storage.objects for delete to authenticated
  using (bucket_id = 'class-materials' and auth_user_role() in ('teacher','owner'));

-- ── Feature 4: automated session reminders (in-app notifications) ────────────
alter table class_sessions
  add column if not exists reminder_sent_at timestamptz;

-- Inserts a one-time reminder for each committed student and the teacher of
-- every scheduled session starting within 24h. Idempotent via reminder_sent_at.
create or replace function send_session_reminders()
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  for r in
    select cs.id as session_id, cs.scheduled_at, cl.name as class_name, cl.teacher_id
    from class_sessions cs
    join classes cl on cl.id = cs.class_id
    where cs.status = 'scheduled'
      and cs.reminder_sent_at is null
      and cs.scheduled_at between now() and now() + interval '24 hours'
  loop
    insert into notifications (user_id, type, message)
    select c.student_id, 'session_reminder',
           'Reminder: "' || r.class_name || '" starts at ' ||
           to_char(r.scheduled_at at time zone 'Asia/Seoul', 'Mon DD, HH24:MI')
    from commitments c
    where c.session_id = r.session_id and c.status = 'committed';

    insert into notifications (user_id, type, message)
    values (r.teacher_id, 'session_reminder',
            'You are teaching "' || r.class_name || '" at ' ||
            to_char(r.scheduled_at at time zone 'Asia/Seoul', 'Mon DD, HH24:MI'));

    update class_sessions set reminder_sent_at = now() where id = r.session_id;
  end loop;
end;
$$;

revoke execute on function send_session_reminders() from public, anon, authenticated;
