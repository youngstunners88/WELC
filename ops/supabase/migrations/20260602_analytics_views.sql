-- 20260602_analytics_views.sql

-- Student attendance summary (security_invoker so RLS applies)
create view v_student_attendance
with (security_invoker = true) as
select
  a.student_id,
  p.full_name,
  count(*) filter (where a.mark in ('present','late')) as attended,
  count(*) filter (where a.mark = 'missed')            as missed,
  count(*)                                             as total,
  round(
    count(*) filter (where a.mark in ('present','late'))::numeric / nullif(count(*),0) * 100,
    1
  ) as attendance_rate
from attendance a
join profiles p on p.id = a.student_id
group by a.student_id, p.full_name;

-- Teacher hours per month
create view v_teacher_hours_monthly
with (security_invoker = true) as
select
  cs.class_id,
  c.teacher_id,
  p.full_name as teacher_name,
  date_trunc('month', cs.scheduled_at)::date as month,
  count(*) as sessions,
  coalesce(sum(cs.actual_minutes), 0) as minutes,
  round(coalesce(sum(cs.actual_minutes), 0) / 60.0, 2) as hours
from class_sessions cs
join classes c on c.id = cs.class_id
join profiles p on p.id = c.teacher_id
where cs.status = 'completed'
group by cs.class_id, c.teacher_id, p.full_name, date_trunc('month', cs.scheduled_at)::date;

-- Daily attendance trend (for the owner chart)
create view v_daily_attendance
with (security_invoker = true) as
select
  cs.scheduled_at::date as day,
  count(*) filter (where a.mark in ('present','late')) as attended,
  count(*) as total,
  round(
    count(*) filter (where a.mark in ('present','late'))::numeric / nullif(count(*),0) * 100,
    1
  ) as rate
from class_sessions cs
left join attendance a on a.session_id = cs.id
where cs.scheduled_at >= now() - interval '30 days'
group by cs.scheduled_at::date
order by day;

-- Owner dashboard RPC — single call returns all four metrics
create or replace function owner_dashboard_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if auth_user_role() <> 'owner' then
    raise exception 'Owner only';
  end if;
  select json_build_object(
    'active_classes',   (select count(*) from classes),
    'total_hours',      coalesce((select round(sum(actual_minutes)/60.0,1) from class_sessions where status='completed'),0),
    'attendance_rate',  coalesce((
      select round(
        count(*) filter (where mark in ('present','late'))::numeric / nullif(count(*),0) * 100, 1
      ) from attendance
      where session_id in (
        select id from class_sessions
        where scheduled_at >= now() - interval '30 days'
      )
    ),0),
    'at_risk_count',    (
      select count(distinct student_id) from (
        select student_id, count(*) as missed_count
        from attendance
        where mark = 'missed'
          and session_id in (
            select id from class_sessions
            where scheduled_at >= now() - interval '30 days'
          )
        group by student_id
        having count(*) >= 3
      ) sub
    )
  ) into result;
  return result;
end;
$$;
