-- ============================================================
-- WELC Academy — Create the head-owner account
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Step 1: Create the auth user
-- Replace the email/password with 위준성's actual credentials.
select auth.admin_create_user(
  '{"email": "owner@welcacademy.com",
    "password": "ChangeMe2024!",
    "email_confirm": true,
    "user_metadata": {"full_name": "위준성", "requested_role": "owner"}
   }'::jsonb
);

-- Step 2: Promote the newly-created profile to owner role.
-- (The signup trigger defaults everyone to student; this overrides it.)
update public.profiles
set role = 'owner', status = 'active'
where email = 'owner@welcacademy.com';

-- Step 3: (Optional) Demote teacherchris37@gmail.com from owner → teacher.
-- Only run this after you have confirmed the owner account above works.
-- update public.profiles
-- set role = 'teacher', status = 'active'
-- where email = 'teacherchris37@gmail.com';
