-- 20260606_schedule_reminders.sql
-- Schedule the reminder sweep with pg_cron (kept separate so a cron/permissions
-- issue here never rolls back the v2 feature migration).

create extension if not exists pg_cron;

-- Named schedule = upsert: re-running replaces the job rather than duplicating.
select cron.schedule(
  'welc-session-reminders',
  '*/30 * * * *',
  $$select public.send_session_reminders()$$
);
