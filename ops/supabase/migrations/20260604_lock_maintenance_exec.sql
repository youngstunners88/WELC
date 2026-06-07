-- 20260604_lock_maintenance_exec.sql
-- Revoke execute on maintenance functions from all client roles
-- (pg_cron calls these as superuser; clients must not)
do $$
begin
  -- send_personal_reminders is created by pg_cron setup; revoke if it exists
  if exists (
    select 1 from pg_proc
    where proname = 'send_personal_reminders'
  ) then
    revoke execute on function send_personal_reminders() from public, anon, authenticated;
  end if;
end;
$$;
