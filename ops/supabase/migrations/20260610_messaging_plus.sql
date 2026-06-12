-- 20260610_messaging_plus.sql
-- Builds on 20260609_messaging.sql. Adds, for the owner:
--   1. Read receipts  — know who has seen a message.
--   2. Scheduled / recurring announcements (dispatched by pg_cron).
--   3. Acknowledgement-required messages (a compliance trail).
--   4. An audit log of sensitive actions.
--   5. Per-teacher monthly performance digests.

-- ─────────────────────────────────────────────────────────────────────────────
-- Column additions
-- ─────────────────────────────────────────────────────────────────────────────
alter table messages
  add column if not exists broadcast_id uuid,
  add column if not exists requires_ack boolean not null default false;

alter table message_threads
  add column if not exists member_last_read_at timestamptz;

create index if not exists idx_messages_broadcast on messages (broadcast_id);

-- notifications gains a 'digest' type (kept alongside 'message' from 20260609)
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('session_reminder','attendance_marked','at_risk_alert','message','digest'));

-- ─────────────────────────────────────────────────────────────────────────────
-- broadcasts — every announcement (immediate or scheduled) is recorded here
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists broadcasts (
  id           uuid primary key default gen_random_uuid(),
  created_by   uuid not null references profiles(id) on delete cascade,
  audience     text not null check (audience in ('all','teachers','students')),
  ciphertext   text not null,
  requires_ack boolean not null default false,
  send_at      timestamptz,                       -- null = sent immediately
  recurrence   text not null default 'none' check (recurrence in ('none','weekly','monthly')),
  status       text not null default 'sent' check (status in ('pending','sent','cancelled')),
  sent_count   int,
  created_at   timestamptz not null default now(),
  sent_at      timestamptz
);
create index if not exists idx_broadcasts_due on broadcasts (status, send_at);

create table if not exists message_acks (
  message_id uuid not null references messages(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  acked_at   timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id) on delete set null,
  actor_role  text,
  action      text not null,
  target_type text,
  target_id   text,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_recent on audit_log (created_at desc);

alter table broadcasts   enable row level security;
alter table message_acks enable row level security;
alter table audit_log    enable row level security;

drop policy if exists "broadcasts: owner reads all" on broadcasts;
create policy "broadcasts: owner reads all" on broadcasts for select
  using (auth_user_role() = 'owner');

drop policy if exists "acks: owner reads all" on message_acks;
create policy "acks: owner reads all" on message_acks for select
  using (auth_user_role() = 'owner');
drop policy if exists "acks: member reads own" on message_acks;
create policy "acks: member reads own" on message_acks for select
  using (user_id = auth.uid());

drop policy if exists "audit: owner reads all" on audit_log;
create policy "audit: owner reads all" on audit_log for select
  using (auth_user_role() = 'owner');

revoke insert, update, delete on broadcasts   from authenticated, anon;
revoke insert, update, delete on message_acks from authenticated, anon;
revoke insert, update, delete on audit_log    from authenticated, anon;
grant select on broadcasts   to authenticated;
grant select on message_acks to authenticated;
grant select on audit_log    to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Audit helper — actor is always the caller; callers cannot forge identity.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function rpc_log_audit(
  p_action text, p_target_type text, p_target_id text, p_detail jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into audit_log (actor_id, actor_role, action, target_type, target_id, detail)
  values (auth.uid(), auth_user_role(), p_action, p_target_type, p_target_id, p_detail);
end;
$$;
revoke execute on function rpc_log_audit(text, text, text, jsonb) from public, anon;
grant  execute on function rpc_log_audit(text, text, text, jsonb) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Shared fan-out — used by both immediate and scheduled broadcasts.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function _welc_fanout_broadcast(p_broadcast_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  b record; r record; v_thread uuid; v_count int := 0;
begin
  select * into b from broadcasts where id = p_broadcast_id;
  if b is null or b.status = 'cancelled' then return 0; end if;

  for r in
    select id from profiles
    where role in ('teacher','student')
      and ( b.audience = 'all'
         or (b.audience = 'teachers' and role = 'teacher')
         or (b.audience = 'students' and role = 'student') )
  loop
    insert into message_threads (member_id, last_message_at, member_unread)
    values (r.id, now(), 1)
    on conflict (member_id) do update
      set last_message_at = now(), member_unread = message_threads.member_unread + 1
    returning id into v_thread;

    insert into messages (thread_id, sender_id, sender_role, ciphertext, broadcast_id, requires_ack)
    values (v_thread, b.created_by, 'owner', b.ciphertext, b.id, b.requires_ack);

    insert into notifications (user_id, type, message)
    values (r.id, 'message', '학원에서 새 메시지가 도착했습니다 · New message from the academy');

    v_count := v_count + 1;
  end loop;

  update broadcasts set status = 'sent', sent_at = now(), sent_count = v_count
  where id = b.id;
  return v_count;
end;
$$;
revoke execute on function _welc_fanout_broadcast(uuid) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- rpc_owner_broadcast — now records a broadcast row + supports requires_ack.
-- (Replaces the 2-arg version from 20260609.)
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists rpc_owner_broadcast(text, text);
create or replace function rpc_owner_broadcast(
  p_audience text, p_ciphertext text, p_requires_ack boolean default false
) returns int language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_count int;
begin
  if auth_user_role() <> 'owner' then raise exception 'Only the academy owner can broadcast'; end if;
  if coalesce(btrim(p_ciphertext),'') = '' then raise exception 'Message is required'; end if;
  if p_audience not in ('all','teachers','students') then raise exception 'Unknown audience'; end if;

  insert into broadcasts (created_by, audience, ciphertext, requires_ack, status)
  values (auth.uid(), p_audience, p_ciphertext, p_requires_ack, 'sent')
  returning id into v_id;

  v_count := _welc_fanout_broadcast(v_id);

  insert into audit_log (actor_id, actor_role, action, target_type, target_id, detail)
  values (auth.uid(), 'owner', 'broadcast.send', 'broadcast', v_id::text,
          jsonb_build_object('audience', p_audience, 'requires_ack', p_requires_ack, 'recipients', v_count));
  return v_count;
end;
$$;
revoke execute on function rpc_owner_broadcast(text, text, boolean) from public, anon;
grant  execute on function rpc_owner_broadcast(text, text, boolean) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Scheduling
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function rpc_schedule_broadcast(
  p_audience text, p_ciphertext text, p_requires_ack boolean,
  p_send_at timestamptz, p_recurrence text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth_user_role() <> 'owner' then raise exception 'Only the academy owner can schedule'; end if;
  if coalesce(btrim(p_ciphertext),'') = '' then raise exception 'Message is required'; end if;
  if p_audience not in ('all','teachers','students') then raise exception 'Unknown audience'; end if;
  if p_recurrence not in ('none','weekly','monthly') then raise exception 'Bad recurrence'; end if;
  if p_send_at is null or p_send_at <= now() then raise exception 'Schedule must be in the future'; end if;

  insert into broadcasts (created_by, audience, ciphertext, requires_ack, send_at, recurrence, status)
  values (auth.uid(), p_audience, p_ciphertext, p_requires_ack, p_send_at, p_recurrence, 'pending')
  returning id into v_id;

  insert into audit_log (actor_id, actor_role, action, target_type, target_id, detail)
  values (auth.uid(), 'owner', 'broadcast.schedule', 'broadcast', v_id::text,
          jsonb_build_object('audience', p_audience, 'send_at', p_send_at, 'recurrence', p_recurrence));
  return v_id;
end;
$$;
revoke execute on function rpc_schedule_broadcast(text, text, boolean, timestamptz, text) from public, anon;
grant  execute on function rpc_schedule_broadcast(text, text, boolean, timestamptz, text) to authenticated;

create or replace function rpc_cancel_broadcast(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth_user_role() <> 'owner' then raise exception 'Owner only'; end if;
  update broadcasts set status = 'cancelled' where id = p_id and status = 'pending';
  insert into audit_log (actor_id, actor_role, action, target_type, target_id, detail)
  values (auth.uid(), 'owner', 'broadcast.cancel', 'broadcast', p_id::text, '{}'::jsonb);
end;
$$;
revoke execute on function rpc_cancel_broadcast(uuid) from public, anon;
grant  execute on function rpc_cancel_broadcast(uuid) to authenticated;

create or replace function dispatch_due_broadcasts()
returns void language plpgsql security definer set search_path = public as $$
declare b record;
begin
  for b in
    select * from broadcasts where status = 'pending' and send_at <= now()
    order by send_at limit 100
  loop
    perform _welc_fanout_broadcast(b.id);
    if b.recurrence = 'weekly' then
      insert into broadcasts (created_by, audience, ciphertext, requires_ack, send_at, recurrence, status)
      values (b.created_by, b.audience, b.ciphertext, b.requires_ack, b.send_at + interval '7 days', 'weekly', 'pending');
    elsif b.recurrence = 'monthly' then
      insert into broadcasts (created_by, audience, ciphertext, requires_ack, send_at, recurrence, status)
      values (b.created_by, b.audience, b.ciphertext, b.requires_ack, b.send_at + interval '1 month', 'monthly', 'pending');
    end if;
  end loop;
end;
$$;
revoke execute on function dispatch_due_broadcasts() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Read receipts + acknowledgements
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function rpc_mark_thread_read(p_thread_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth_user_role() = 'owner' then
    update message_threads set owner_unread = 0 where id = p_thread_id;
  else
    update message_threads
      set member_unread = 0, member_last_read_at = now()
      where id = p_thread_id and member_id = auth.uid();
  end if;
end;
$$;

create or replace function rpc_ack_message(p_message_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from messages m
    join message_threads t on t.id = m.thread_id
    where m.id = p_message_id and t.member_id = auth.uid() and m.requires_ack
  ) then
    raise exception 'Nothing to acknowledge';
  end if;
  insert into message_acks (message_id, user_id)
  values (p_message_id, auth.uid())
  on conflict (message_id, user_id) do nothing;
end;
$$;
revoke execute on function rpc_ack_message(uuid) from public, anon;
grant  execute on function rpc_ack_message(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Per-teacher monthly digest. Owner sees all teachers; a teacher sees only self.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function rpc_teacher_digests(p_month date default current_date)
returns table (
  teacher_id uuid, teacher_name text,
  sessions bigint, hours numeric,
  attendance_rate numeric, students bigint, at_risk bigint
) language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare v_month date := date_trunc('month', p_month)::date;
begin
  if auth_user_role() not in ('owner','teacher') then
    raise exception 'Not authorized';
  end if;

  return query
  select
    p.id, p.full_name,
    coalesce(h.sessions, 0)::bigint,
    coalesce(h.hours, 0)::numeric,
    att.rate,
    coalesce(st.cnt, 0)::bigint,
    coalesce(st.at_risk, 0)::bigint
  from profiles p
  left join (
    select vh.teacher_id, sum(vh.sessions) as sessions, sum(vh.hours) as hours
    from v_teacher_hours_monthly vh where vh.month = v_month group by vh.teacher_id
  ) h on h.teacher_id = p.id
  left join (
    select cl.teacher_id,
      round(count(*) filter (where a.mark in ('present','late'))::numeric
            / nullif(count(*),0) * 100, 1) as rate
    from attendance a
    join class_sessions cs on cs.id = a.session_id
    join classes cl on cl.id = cs.class_id
    where date_trunc('month', cs.scheduled_at)::date = v_month
    group by cl.teacher_id
  ) att on att.teacher_id = p.id
  left join (
    select vts.teacher_id,
      count(*) as cnt,
      count(*) filter (where vts.total > 0 and coalesce(vts.attendance_rate,100) < 70) as at_risk
    from v_teacher_students vts group by vts.teacher_id
  ) st on st.teacher_id = p.id
  where p.role = 'teacher'
    and (auth_user_role() = 'owner' or p.id = auth.uid())
  order by p.full_name;
end;
$$;
revoke execute on function rpc_teacher_digests(date) from public, anon;
grant  execute on function rpc_teacher_digests(date) to authenticated;

-- Monthly nudge: tell each teacher their summary is ready (in-app only).
create or replace function notify_monthly_digests()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, type, message)
  select id, 'digest', '지난달 강의 요약이 준비되었습니다 · Your monthly teaching summary is ready'
  from profiles where role = 'teacher';
  insert into audit_log (actor_id, actor_role, action, target_type, target_id, detail)
  values (null, 'system', 'digest.monthly_notify', 'system', null, '{}'::jsonb);
end;
$$;
revoke execute on function notify_monthly_digests() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Cron (pg_cron enabled in 20260606)
-- ─────────────────────────────────────────────────────────────────────────────
select cron.schedule('welc-dispatch-broadcasts', '*/5 * * * *',
  $$select public.dispatch_due_broadcasts()$$);
select cron.schedule('welc-monthly-digests', '0 9 1 * *',
  $$select public.notify_monthly_digests()$$);
