-- 20260609_messaging.sql
-- "Flight Deck" messaging: the owner broadcasts to teachers/students and they
-- may REPLY, but members can never initiate a thread and never see each other.
-- Message bodies are stored as ciphertext (AES-256-GCM) produced by the app
-- server; the database only ever holds encrypted blobs.
--
-- Trust model: this is owner-mediated 1↔many messaging, NOT end-to-end. The
-- app server holds the symmetric key (MESSAGE_ENCRYPTION_KEY) and encrypts on
-- write / decrypts on read for authorized callers. RLS decides authorization;
-- encryption protects the data at rest (dumps, backups, console access).

-- ── Threads: exactly one per member, always owned by "the academy" ───────────
create table if not exists message_threads (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null unique references profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  member_unread   int not null default 0,
  owner_unread    int not null default 0,
  created_at      timestamptz not null default now()
);

create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references message_threads(id) on delete cascade,
  sender_id   uuid not null references profiles(id) on delete cascade,
  sender_role text not null check (sender_role in ('owner','member')),
  ciphertext  text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_messages_thread on messages (thread_id, created_at);
create index if not exists idx_threads_recent on message_threads (last_message_at desc);

alter table message_threads enable row level security;
alter table messages         enable row level security;

-- ── Reads: owner sees everything; a member sees only their own thread ────────
drop policy if exists "threads: owner reads all" on message_threads;
create policy "threads: owner reads all" on message_threads for select
  using (auth_user_role() = 'owner');

drop policy if exists "threads: member reads own" on message_threads;
create policy "threads: member reads own" on message_threads for select
  using (member_id = auth.uid());

drop policy if exists "messages: owner reads all" on messages;
create policy "messages: owner reads all" on messages for select
  using (auth_user_role() = 'owner');

drop policy if exists "messages: member reads own thread" on messages;
create policy "messages: member reads own thread" on messages for select
  using (thread_id in (select id from message_threads where member_id = auth.uid()));

-- ── Writes: clients NEVER write these tables directly. Every mutation flows
--    through the security-definer RPCs below (same pattern as class_sessions).
revoke insert, update, delete on message_threads from authenticated, anon;
revoke insert, update, delete on messages         from authenticated, anon;
grant select on message_threads to authenticated;
grant select on messages         to authenticated;

-- ── Notifications gain a 'message' type ──────────────────────────────────────
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('session_reminder','attendance_marked','at_risk_alert','message'));

-- ── rpc_owner_broadcast — owner sends one message to an audience ─────────────
create or replace function rpc_owner_broadcast(p_audience text, p_ciphertext text)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_count int := 0;
  r record;
  v_thread uuid;
begin
  if auth_user_role() <> 'owner' then
    raise exception 'Only the academy owner can broadcast';
  end if;
  if coalesce(btrim(p_ciphertext), '') = '' then
    raise exception 'Message is required';
  end if;
  if p_audience not in ('all','teachers','students') then
    raise exception 'Unknown audience';
  end if;

  for r in
    select id from profiles
    where role in ('teacher','student')
      and ( p_audience = 'all'
         or (p_audience = 'teachers' and role = 'teacher')
         or (p_audience = 'students' and role = 'student') )
  loop
    insert into message_threads (member_id, last_message_at, member_unread)
    values (r.id, now(), 1)
    on conflict (member_id) do update
      set last_message_at = now(),
          member_unread   = message_threads.member_unread + 1
    returning id into v_thread;

    insert into messages (thread_id, sender_id, sender_role, ciphertext)
    values (v_thread, auth.uid(), 'owner', p_ciphertext);

    insert into notifications (user_id, type, message)
    values (r.id, 'message', '학원에서 새 메시지가 도착했습니다 · New message from the academy');

    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ── rpc_owner_reply — owner replies inside one member's thread ───────────────
create or replace function rpc_owner_reply(p_thread_id uuid, p_ciphertext text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth_user_role() <> 'owner' then
    raise exception 'Only the academy owner can send here';
  end if;
  if coalesce(btrim(p_ciphertext), '') = '' then
    raise exception 'Message is required';
  end if;
  if not exists (select 1 from message_threads where id = p_thread_id) then
    raise exception 'Thread not found';
  end if;

  insert into messages (thread_id, sender_id, sender_role, ciphertext)
  values (p_thread_id, auth.uid(), 'owner', p_ciphertext);

  update message_threads
    set last_message_at = now(), member_unread = member_unread + 1
    where id = p_thread_id;

  insert into notifications (user_id, type, message)
  select member_id, 'message', '학원에서 새 메시지가 도착했습니다 · New message from the academy'
  from message_threads where id = p_thread_id;
end;
$$;

-- ── rpc_member_reply — a member may ONLY reply to an existing thread ─────────
-- There is no path for a member to create a thread, so they can never initiate
-- a conversation, and (because each thread is keyed to its own member) they can
-- never reach another member. This is the core of the owner's policy.
create or replace function rpc_member_reply(p_ciphertext text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_thread uuid;
  v_role   text := auth_user_role();
begin
  if v_role not in ('teacher','student') then
    raise exception 'Only members reply here';
  end if;
  if coalesce(btrim(p_ciphertext), '') = '' then
    raise exception 'Message is required';
  end if;

  select id into v_thread from message_threads where member_id = auth.uid();
  if v_thread is null then
    raise exception 'You cannot start a conversation — please wait for the academy to message you first';
  end if;

  insert into messages (thread_id, sender_id, sender_role, ciphertext)
  values (v_thread, auth.uid(), 'member', p_ciphertext);

  update message_threads
    set last_message_at = now(), owner_unread = owner_unread + 1
    where id = v_thread;

  return v_thread;
end;
$$;

-- ── rpc_mark_thread_read — clear the caller's unread counter ─────────────────
create or replace function rpc_mark_thread_read(p_thread_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth_user_role() = 'owner' then
    update message_threads set owner_unread = 0 where id = p_thread_id;
  else
    update message_threads set member_unread = 0
      where id = p_thread_id and member_id = auth.uid();
  end if;
end;
$$;

revoke execute on function rpc_owner_broadcast(text, text)   from public, anon;
revoke execute on function rpc_owner_reply(uuid, text)        from public, anon;
revoke execute on function rpc_member_reply(text)             from public, anon;
revoke execute on function rpc_mark_thread_read(uuid)         from public, anon;
grant  execute on function rpc_owner_broadcast(text, text)   to authenticated;
grant  execute on function rpc_owner_reply(uuid, text)        to authenticated;
grant  execute on function rpc_member_reply(text)             to authenticated;
grant  execute on function rpc_mark_thread_read(uuid)         to authenticated;
