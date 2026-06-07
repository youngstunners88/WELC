-- 20260601_initial_schema.sql

-- Auth helper: reads role from profiles without exposing the table
create or replace function auth_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

-- Profiles (extends auth.users)
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text not null,
  full_name   text not null,
  phone       text,
  role        text not null check (role in ('owner','teacher','student')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Trigger: create profile on signup, ALWAYS hard-code role='student'
-- (owners must be elevated manually in the Supabase dashboard)
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    'student'   -- ALWAYS student; owner role set manually
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- RPC: owner-only role setter
create or replace function set_user_role(target_user_id uuid, new_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth_user_role() <> 'owner' then
    raise exception 'Only owners can set roles';
  end if;
  if new_role not in ('owner','teacher','student') then
    raise exception 'Invalid role';
  end if;
  update profiles set role = new_role, updated_at = now()
  where id = target_user_id;
end;
$$;

-- Classes
create table classes (
  id                uuid primary key default gen_random_uuid(),
  created_by        uuid not null references profiles(id),
  name              text not null,
  level             text not null check (level in ('beginner','intermediate','advanced')),
  teacher_id        uuid not null references profiles(id),
  start_date        date not null,
  duration_minutes  int  not null check (duration_minutes between 30 and 240),
  meeting_platform  text check (meeting_platform in ('zoom','google_meet','in_person')),
  meeting_link      text check (meeting_link is null or meeting_link ~* '^https?://'),
  description       text,
  created_at        timestamptz default now()
);

-- Sessions (4 per class, auto-generated weekly from start_date)
create table class_sessions (
  id              uuid primary key default gen_random_uuid(),
  class_id        uuid not null references classes(id) on delete cascade,
  session_number  int  not null check (session_number between 1 and 4),
  scheduled_at    timestamptz not null,
  status          text not null default 'scheduled'
                  check (status in ('scheduled','in_progress','completed','cancelled')),
  actual_minutes  int,
  started_at      timestamptz,
  ended_at        timestamptz,
  created_at      timestamptz default now(),
  unique (class_id, session_number)
);

-- Commitments
create table commitments (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references profiles(id),
  session_id  uuid not null references class_sessions(id) on delete cascade,
  status      text not null default 'committed'
              check (status in ('committed','attended','no_show','uncommitted')),
  created_at  timestamptz default now(),
  unique (student_id, session_id)
);

-- Attendance
create table attendance (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references class_sessions(id) on delete cascade,
  student_id  uuid not null references profiles(id),
  mark        text not null check (mark in ('present','late','missed')),
  created_at  timestamptz default now(),
  unique (session_id, student_id)
);

-- Notifications
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  type        text not null check (type in ('session_reminder','attendance_marked','at_risk_alert')),
  message     text not null,
  read        boolean not null default false,
  created_at  timestamptz default now()
);

-- Enable RLS on all tables
alter table profiles        enable row level security;
alter table classes         enable row level security;
alter table class_sessions  enable row level security;
alter table commitments     enable row level security;
alter table attendance      enable row level security;
alter table notifications   enable row level security;
