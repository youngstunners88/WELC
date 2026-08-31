-- 20260831_data_rights.sql
-- GDPR / PIPA data-subject rights (secure-build checklist DATA002):
-- a self-service export and account-deletion path, each scoped strictly to the
-- caller's own data via auth.uid(). Both are SECURITY DEFINER so they can read
-- across the caller's rows and delete the auth.users row, but neither ever
-- touches another user's data.

-- ── Export: return everything we hold about the caller as one JSON document ──
create or replace function rpc_export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select jsonb_build_object(
    'profile',       (select to_jsonb(p) from profiles p where p.id = auth.uid()),
    'attendance',    (select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at), '[]'::jsonb)
                        from attendance a where a.student_id = auth.uid()),
    'notifications', (select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at), '[]'::jsonb)
                        from notifications n where n.user_id = auth.uid()),
    'messages',      (select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at), '[]'::jsonb)
                        from messages m where m.sender_id = auth.uid()),
    'exported_at',   now()
  ) into v;

  return v;
end;
$$;

revoke execute on function rpc_export_my_data() from public, anon;
grant  execute on function rpc_export_my_data() to authenticated;

-- ── Deletion: remove the caller's account and personal data ──────────────────
-- The owner account is intentionally non-deletable via self-service (deleting it
-- would orphan the academy). Attendance rows reference profiles WITHOUT a cascade,
-- so they are cleared explicitly before removing the auth.users row; everything
-- else (profile, threads, messages, notifications, ai usage) cascades from there.
create or replace function rpc_delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select role into v_role from profiles where id = auth.uid();
  if v_role = 'owner' then
    raise exception 'The owner account cannot be self-deleted. Contact support.';
  end if;

  delete from attendance where student_id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function rpc_delete_my_account() from public, anon;
grant  execute on function rpc_delete_my_account() to authenticated;
