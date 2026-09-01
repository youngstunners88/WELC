-- 20260831_rpc_hardening.sql
-- Defense-in-depth hardening from the Supabase security linter + secure-build audit.
--
-- Context: every SECURITY DEFINER function below ALREADY enforces authorization
-- internally (owner-only functions raise 'Owner only'; teacher functions check
-- teacher_id = auth.uid()). So there is no live privilege-escalation hole. These
-- changes close the linter warnings by (a) removing EXECUTE from the anon role so
-- unauthenticated callers can't even reach the endpoints, and (b) pinning the
-- search_path on the one trigger function that was missing it, so it can't be
-- hijacked by a malicious schema on the session search_path.

-- 1) Pin search_path on the commitment-window trigger (lint 0011).
--    A SECURITY-agnostic trigger with a mutable search_path can be steered to
--    resolve `class_sessions` to an attacker-controlled table if they can set
--    search_path. Pinning removes the ambiguity.
alter function public.enforce_commitment_window() set search_path = public;

-- 2) Take EXECUTE away from anon on every privileged RPC (lints 0028/0029).
--    IMPORTANT: Postgres grants EXECUTE to PUBLIC by default when a function is
--    created, and PUBLIC covers anon — so revoking from anon alone is a no-op
--    while the PUBLIC grant stands. We must revoke from PUBLIC, then grant back
--    to authenticated (whose own internal role checks are the real gate).
do $$
declare
  fn text;
  fns text[] := array[
    'auth_user_role()',
    'set_user_role(uuid, text)',
    'reject_teacher_request(uuid)',
    'owner_dashboard_stats()',
    'rpc_start_session(uuid)',
    'rpc_end_session(uuid)',
    'rpc_ack_message(uuid)',
    'rpc_cancel_broadcast(uuid)',
    'rpc_log_audit(text, text, text, jsonb)',
    'rpc_log_session(uuid, integer)',
    'rpc_mark_thread_read(uuid)',
    'rpc_member_reply(text)',
    'rpc_owner_broadcast(text, text, boolean)',
    'rpc_owner_dm(uuid, text)',
    'rpc_owner_reply(uuid, text)',
    'rpc_schedule_broadcast(text, text, boolean, timestamptz, text)',
    'rpc_send_reminder(text, uuid, text)',
    'rpc_teacher_digests(date)',
    'rpc_check_and_bump_ai_usage(integer)'
  ];
begin
  foreach fn in array fns loop
    begin
      execute format('revoke execute on function public.%s from public, anon;', fn);
      execute format('grant execute on function public.%s to authenticated;', fn);
    exception when undefined_function then
      raise notice 'skip (not found): %', fn;
    end;
  end loop;
end $$;

-- handle_new_user() is a trigger fired by the auth system on INSERT into
-- auth.users; it is not meant to be called over the REST API at all.
do $$
begin
  execute 'revoke execute on function public.handle_new_user() from public, anon, authenticated';
exception when undefined_function then
  raise notice 'handle_new_user not found';
end $$;
