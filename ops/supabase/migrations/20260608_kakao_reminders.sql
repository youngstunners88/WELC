-- 20260608_kakao_reminders.sql
-- KakaoTalk notification prefs + a reminder engine the owner can drive manually
-- or through the AI chatbot (send-now and schedule-for-later).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Per-user notification preferences (phone already exists on profiles).
-- ─────────────────────────────────────────────────────────────────────────────
alter table profiles
  add column if not exists kakao_alimtalk_consent boolean not null default false,
  add column if not exists notification_preferences jsonb not null default
    '{"in_app": true, "email": false, "kakao_alimtalk": false}'::jsonb;

-- Let users toggle their own Kakao consent (column-level grants from 20260605
-- restrict profile self-updates to an explicit allow-list).
grant update (kakao_alimtalk_consent, notification_preferences) on profiles to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. rpc_send_reminder — send an in-app reminder NOW to an audience, and return
--    the consented Kakao recipients so the server can fan out AlimTalk messages.
--    Owners may target anyone; teachers only their own sessions/students.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function rpc_send_reminder(
  p_audience text,           -- 'session' | 'tomorrow' | 'all_students'
  p_session_id uuid,         -- required when p_audience = 'session'
  p_message text
)
returns table(recipient_id uuid, full_name text, phone text, kakao_consent boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_role text := auth_user_role();
begin
  if v_role not in ('owner','teacher') then
    raise exception 'Only owners and teachers can send reminders';
  end if;
  if coalesce(btrim(p_message),'') = '' then
    raise exception 'Message is required';
  end if;
  if length(p_message) > 500 then
    raise exception 'Message too long';
  end if;

  if p_audience = 'session' then
    if p_session_id is null then
      raise exception 'session_id is required';
    end if;
    -- teachers may only message their own session
    if v_role = 'teacher' and not exists (
      select 1 from class_sessions cs
      join classes cl on cl.id = cs.class_id
      where cs.id = p_session_id and cl.teacher_id = auth.uid()
    ) then
      raise exception 'Not your session';
    end if;

    return query
    with targets as (
      select distinct c.student_id as uid
      from commitments c
      where c.session_id = p_session_id and c.status = 'committed'
    ),
    ins as (
      insert into notifications (user_id, type, message)
      select uid, 'session_reminder', p_message from targets
      returning user_id
    )
    select p.id, p.full_name, p.phone, p.kakao_alimtalk_consent
    from profiles p where p.id in (select user_id from ins);

  elsif p_audience = 'tomorrow' then
    return query
    with targets as (
      select distinct c.student_id as uid
      from commitments c
      join class_sessions cs on cs.id = c.session_id
      join classes cl on cl.id = cs.class_id
      where c.status = 'committed'
        and (cs.scheduled_at at time zone 'Asia/Seoul')::date
            = ((now() at time zone 'Asia/Seoul')::date + 1)
        and (v_role = 'owner' or cl.teacher_id = auth.uid())
    ),
    ins as (
      insert into notifications (user_id, type, message)
      select uid, 'session_reminder', p_message from targets
      returning user_id
    )
    select p.id, p.full_name, p.phone, p.kakao_alimtalk_consent
    from profiles p where p.id in (select user_id from ins);

  elsif p_audience = 'all_students' then
    if v_role <> 'owner' then
      raise exception 'Only owners can message all students';
    end if;
    return query
    with ins as (
      insert into notifications (user_id, type, message)
      select id, 'session_reminder', p_message from profiles where role = 'student'
      returning user_id
    )
    select p.id, p.full_name, p.phone, p.kakao_alimtalk_consent
    from profiles p where p.id in (select user_id from ins);
  else
    raise exception 'Unknown audience';
  end if;
end;
$$;

revoke execute on function rpc_send_reminder(text, uuid, text) from public, anon;
grant execute on function rpc_send_reminder(text, uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. scheduled_reminders — future-dated reminders the cron job dispatches.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists scheduled_reminders (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid not null references profiles(id),
  audience    text not null check (audience in ('session','tomorrow','all_students')),
  session_id  uuid references class_sessions(id) on delete cascade,
  message     text not null,
  send_at     timestamptz not null,
  status      text not null default 'pending' check (status in ('pending','sent','cancelled')),
  sent_count  int,
  created_at  timestamptz not null default now()
);

alter table scheduled_reminders enable row level security;

create policy "reminders: owner all" on scheduled_reminders for all
  using (auth_user_role() = 'owner') with check (auth_user_role() = 'owner');

create policy "reminders: teacher own" on scheduled_reminders for all
  using (auth_user_role() = 'teacher' and created_by = auth.uid())
  with check (auth_user_role() = 'teacher' and created_by = auth.uid());

-- Dispatch due reminders (called by cron). Reuses rpc_send_reminder logic via a
-- direct insert so it runs as the scheduler, not a user.
create or replace function dispatch_due_reminders()
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_count int;
begin
  for r in
    select * from scheduled_reminders
    where status = 'pending' and send_at <= now()
    order by send_at
    limit 200
  loop
    if r.audience = 'session' and r.session_id is not null then
      insert into notifications (user_id, type, message)
      select distinct c.student_id, 'session_reminder', r.message
      from commitments c
      where c.session_id = r.session_id and c.status = 'committed';
    elsif r.audience = 'tomorrow' then
      insert into notifications (user_id, type, message)
      select distinct c.student_id, 'session_reminder', r.message
      from commitments c
      join class_sessions cs on cs.id = c.session_id
      where c.status = 'committed'
        and (cs.scheduled_at at time zone 'Asia/Seoul')::date
            = ((now() at time zone 'Asia/Seoul')::date + 1);
    elsif r.audience = 'all_students' then
      insert into notifications (user_id, type, message)
      select id, 'session_reminder', r.message from profiles where role = 'student';
    end if;
    get diagnostics v_count = row_count;
    update scheduled_reminders
      set status = 'sent', sent_count = v_count where id = r.id;
  end loop;
end;
$$;

revoke execute on function dispatch_due_reminders() from public, anon, authenticated;

-- Run every 5 minutes (pg_cron was enabled in 20260606).
select cron.schedule('welc-dispatch-reminders', '*/5 * * * *',
  $$select public.dispatch_due_reminders()$$);
