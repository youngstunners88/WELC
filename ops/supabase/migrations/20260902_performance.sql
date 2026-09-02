-- 20260902_performance.sql
-- Performance findings from the Supabase advisor, all verified against the
-- live database. No behaviour changes — every policy below keeps exactly the
-- same logic.
--
-- 1) auth_rls_initplan (18 policies): a policy calling auth.uid() or
--    auth_user_role() directly re-evaluates that function ONCE PER ROW.
--    Wrapping it in a scalar subquery — (select auth.uid()) — lets Postgres
--    hoist it into an InitPlan and evaluate it once per query. Identical
--    semantics, materially cheaper as the tables grow. With 5 users today
--    this is invisible; at a few hundred students it is not.
--
-- 2) unindexed_foreign_keys (14): FK columns with no covering index make
--    joins and cascading deletes scan. Added below.
--
-- Generated from pg_policies rather than hand-written, so the rewritten
-- predicates are exactly the deployed ones.

drop policy if exists "attendance: owner full access" on attendance;
create policy "attendance: owner full access" on attendance
  as permissive
  for all
  to public
  using (((select auth_user_role()) = 'owner'::text));

drop policy if exists "attendance: student reads own" on attendance;
create policy "attendance: student reads own" on attendance
  as permissive
  for select
  to public
  using ((student_id = (select auth.uid())));

drop policy if exists "attendance: teacher manages for own sessions" on attendance;
create policy "attendance: teacher manages for own sessions" on attendance
  as permissive
  for all
  to public
  using ((session_id IN ( SELECT cs.id
   FROM (class_sessions cs
     JOIN classes cl ON ((cl.id = cs.class_id)))
  WHERE (cl.teacher_id = (select auth.uid())))));

drop policy if exists "audit: owner reads all" on audit_log;
create policy "audit: owner reads all" on audit_log
  as permissive
  for select
  to public
  using (((select auth_user_role()) = 'owner'::text));

drop policy if exists "broadcasts: owner reads all" on broadcasts;
create policy "broadcasts: owner reads all" on broadcasts
  as permissive
  for select
  to public
  using (((select auth_user_role()) = 'owner'::text));

drop policy if exists "sessions: owner can insert/delete" on class_sessions;
create policy "sessions: owner can insert/delete" on class_sessions
  as permissive
  for insert
  to public
  with check (((select auth_user_role()) = 'owner'::text));

drop policy if exists "sessions: visible to all authenticated" on class_sessions;
create policy "sessions: visible to all authenticated" on class_sessions
  as permissive
  for select
  to public
  using (((select auth.uid()) IS NOT NULL));

drop policy if exists "classes: owner full access" on classes;
create policy "classes: owner full access" on classes
  as permissive
  for all
  to public
  using (((select auth_user_role()) = 'owner'::text))
  with check ((((select auth_user_role()) = 'owner'::text) AND (created_by = (select auth.uid()))));

drop policy if exists "classes: student reads all" on classes;
create policy "classes: student reads all" on classes
  as permissive
  for select
  to public
  using (((select auth_user_role()) = 'student'::text));

drop policy if exists "classes: teacher reads own" on classes;
create policy "classes: teacher reads own" on classes
  as permissive
  for select
  to public
  using ((teacher_id = (select auth.uid())));

drop policy if exists "commitments: owner reads all" on commitments;
create policy "commitments: owner reads all" on commitments
  as permissive
  for select
  to public
  using (((select auth_user_role()) = 'owner'::text));

drop policy if exists "commitments: student manages own" on commitments;
create policy "commitments: student manages own" on commitments
  as permissive
  for all
  to public
  using ((student_id = (select auth.uid())))
  with check ((student_id = (select auth.uid())));

drop policy if exists "commitments: teacher reads for own sessions" on commitments;
create policy "commitments: teacher reads for own sessions" on commitments
  as permissive
  for select
  to public
  using ((session_id IN ( SELECT cs.id
   FROM (class_sessions cs
     JOIN classes cl ON ((cl.id = cs.class_id)))
  WHERE (cl.teacher_id = (select auth.uid())))));

drop policy if exists "materials: owner full access" on materials;
create policy "materials: owner full access" on materials
  as permissive
  for all
  to public
  using (((select auth_user_role()) = 'owner'::text))
  with check (((select auth_user_role()) = 'owner'::text));

drop policy if exists "materials: students read enrolled" on materials;
create policy "materials: students read enrolled" on materials
  as permissive
  for select
  to public
  using ((((select auth_user_role()) = 'student'::text) AND (class_id IN ( SELECT cs.class_id
   FROM (commitments c
     JOIN class_sessions cs ON ((cs.id = c.session_id)))
  WHERE (c.student_id = (select auth.uid()))))));

drop policy if exists "materials: teacher manages own class" on materials;
create policy "materials: teacher manages own class" on materials
  as permissive
  for all
  to public
  using ((class_id IN ( SELECT classes.id
   FROM classes
  WHERE (classes.teacher_id = (select auth.uid())))))
  with check ((class_id IN ( SELECT classes.id
   FROM classes
  WHERE (classes.teacher_id = (select auth.uid())))));

drop policy if exists "acks: member reads own" on message_acks;
create policy "acks: member reads own" on message_acks
  as permissive
  for select
  to public
  using ((user_id = (select auth.uid())));

drop policy if exists "acks: owner reads all" on message_acks;
create policy "acks: owner reads all" on message_acks
  as permissive
  for select
  to public
  using (((select auth_user_role()) = 'owner'::text));

drop policy if exists "threads: member reads own" on message_threads;
create policy "threads: member reads own" on message_threads
  as permissive
  for select
  to public
  using ((member_id = (select auth.uid())));

drop policy if exists "threads: owner reads all" on message_threads;
create policy "threads: owner reads all" on message_threads
  as permissive
  for select
  to public
  using (((select auth_user_role()) = 'owner'::text));

drop policy if exists "messages: member reads own thread" on messages;
create policy "messages: member reads own thread" on messages
  as permissive
  for select
  to public
  using ((thread_id IN ( SELECT message_threads.id
   FROM message_threads
  WHERE (message_threads.member_id = (select auth.uid())))));

drop policy if exists "messages: owner reads all" on messages;
create policy "messages: owner reads all" on messages
  as permissive
  for select
  to public
  using (((select auth_user_role()) = 'owner'::text));

drop policy if exists "notifications: own only" on notifications;
create policy "notifications: own only" on notifications
  as permissive
  for all
  to public
  using ((user_id = (select auth.uid())))
  with check ((user_id = (select auth.uid())));

drop policy if exists "profiles: owner read all" on profiles;
create policy "profiles: owner read all" on profiles
  as permissive
  for select
  to public
  using (((select auth_user_role()) = 'owner'::text));

drop policy if exists "profiles: self read" on profiles;
create policy "profiles: self read" on profiles
  as permissive
  for select
  to public
  using ((id = (select auth.uid())));

drop policy if exists "profiles: self update" on profiles;
create policy "profiles: self update" on profiles
  as permissive
  for update
  to public
  using ((id = (select auth.uid())));

drop policy if exists "profiles: teacher reads own students" on profiles;
create policy "profiles: teacher reads own students" on profiles
  as permissive
  for select
  to public
  using ((((select auth_user_role()) = 'teacher'::text) AND (id IN ( SELECT c2.student_id
   FROM ((commitments c2
     JOIN class_sessions cs ON ((cs.id = c2.session_id)))
     JOIN classes cl ON ((cl.id = cs.class_id)))
  WHERE (cl.teacher_id = (select auth.uid()))))));

drop policy if exists "profiles: teacher reads referred students" on profiles;
create policy "profiles: teacher reads referred students" on profiles
  as permissive
  for select
  to public
  using ((((select auth_user_role()) = 'teacher'::text) AND (referred_by = (select auth.uid()))));

drop policy if exists "reminders: owner all" on scheduled_reminders;
create policy "reminders: owner all" on scheduled_reminders
  as permissive
  for all
  to public
  using (((select auth_user_role()) = 'owner'::text))
  with check (((select auth_user_role()) = 'owner'::text));

drop policy if exists "reminders: teacher own" on scheduled_reminders;
create policy "reminders: teacher own" on scheduled_reminders
  as permissive
  for all
  to public
  using ((((select auth_user_role()) = 'teacher'::text) AND (created_by = (select auth.uid()))))
  with check ((((select auth_user_role()) = 'teacher'::text) AND (created_by = (select auth.uid()))));
-- ── Covering indexes for foreign keys ───────────────────────────────────────
create index if not exists idx_attendance_student on attendance (student_id);
create index if not exists idx_audit_log_actor on audit_log (actor_id);
create index if not exists idx_broadcasts_created_by on broadcasts (created_by);
create index if not exists idx_classes_created_by on classes (created_by);
create index if not exists idx_classes_teacher on classes (teacher_id);
create index if not exists idx_commitments_session on commitments (session_id);
create index if not exists idx_materials_class on materials (class_id);
create index if not exists idx_materials_uploaded_by on materials (uploaded_by);
create index if not exists idx_message_acks_user on message_acks (user_id);
create index if not exists idx_messages_sender on messages (sender_id);
create index if not exists idx_notifications_user on notifications (user_id);
create index if not exists idx_profiles_referred_by on profiles (referred_by);
create index if not exists idx_scheduled_reminders_created_by on scheduled_reminders (created_by);
create index if not exists idx_scheduled_reminders_session on scheduled_reminders (session_id);
