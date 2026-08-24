-- 20260614_security_hardening.sql
-- Server-side, tamper-proof daily AI usage cap. The in-memory rate limiter in
-- the app tier resets on cold start and doesn't share state across serverless
-- instances — this table + RPC is the durable backstop.

create table if not exists ai_usage_daily (
  user_id uuid not null references profiles(id) on delete cascade,
  day     date not null default (now() at time zone 'Asia/Seoul')::date,
  count   int  not null default 0,
  primary key (user_id, day)
);

alter table ai_usage_daily enable row level security;

drop policy if exists "ai usage: read own" on ai_usage_daily;
create policy "ai usage: read own" on ai_usage_daily for select
  using (user_id = auth.uid());

drop policy if exists "ai usage: owner reads all" on ai_usage_daily;
create policy "ai usage: owner reads all" on ai_usage_daily for select
  using (auth_user_role() = 'owner');

-- Clients never write this table directly — only the RPC below, which is the
-- only party that may increment a counter (and only for the caller's own id).
revoke insert, update, delete on ai_usage_daily from authenticated, anon;
grant select on ai_usage_daily to authenticated;

-- Atomically bump today's counter for the caller and raise if that would
-- exceed p_limit. The WHERE clause on the ON CONFLICT UPDATE makes the whole
-- check-and-increment race-safe: a second concurrent call that would tip the
-- count over the limit updates zero rows, so RETURNING yields no row and the
-- exception fires instead of silently over-counting.
create or replace function rpc_check_and_bump_ai_usage(p_limit int default 50)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_count int;
  v_day date := (now() at time zone 'Asia/Seoul')::date;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into ai_usage_daily (user_id, day, count)
  values (auth.uid(), v_day, 1)
  on conflict (user_id, day) do update
    set count = ai_usage_daily.count + 1
    where ai_usage_daily.count < p_limit
  returning count into v_count;

  if v_count is null then
    raise exception 'Daily AI message limit reached (% messages). Try again tomorrow.', p_limit;
  end if;

  return v_count;
end;
$$;

revoke execute on function rpc_check_and_bump_ai_usage(int) from public, anon;
grant  execute on function rpc_check_and_bump_ai_usage(int) to authenticated;
