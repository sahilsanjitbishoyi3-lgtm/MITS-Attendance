-- MITS Attendance Portal: stricter role-based security migration
-- Apply only after reviewing in a Supabase test project. This migration
-- replaces broad starter policies with assignment-scoped policies.
-- Never put a Supabase service_role key in browser code.

begin;

-- Add the requested Leave status while retaining existing Excused records.
alter type public.attendance_status add value if not exists 'leave';

-- Assignment table: a teacher may only access classes/subjects explicitly
-- assigned here. Admins manage assignments.
create table if not exists public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (teacher_id, subject_id)
);

alter table public.teacher_assignments enable row level security;

-- Helpers use a fixed search_path and read only the signed-in user's profile.
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin' and p.is_active
  );
$$;

create or replace function public.is_teacher()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'teacher' and p.is_active
  );
$$;

create or replace function public.is_active_student()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'student' and p.is_active
  );
$$;

create or replace function public.teacher_has_subject(target_subject uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.teacher_assignments a
    where a.teacher_id = (select auth.uid())
      and a.subject_id = target_subject
  );
$$;

create or replace function public.student_in_subject_class(target_student uuid, target_subject uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    join public.subjects s
      on s.department = p.department
     and s.academic_year = p.academic_year
     and s.semester = p.semester
     and s.section = coalesce(p.section, 'A')
    where p.id = target_student
      and p.role = 'student'
      and p.is_active
      and s.id = target_subject
      and s.is_active
  );
$$;

-- Remove permissive starter policies before installing scoped policies.
drop policy if exists "profiles read self or admin/teacher" on public.profiles;
drop policy if exists "admin manages profiles" on public.profiles;
drop policy if exists "authenticated read active subjects" on public.subjects;
drop policy if exists "admin manages subjects" on public.subjects;
drop policy if exists "teachers and admin read sessions" on public.attendance_sessions;
drop policy if exists "teacher creates own sessions" on public.attendance_sessions;
drop policy if exists "teacher updates own unlocked sessions or admin" on public.attendance_sessions;
drop policy if exists "students read own attendance and staff read" on public.attendance_records;
drop policy if exists "staff mark attendance" on public.attendance_records;
drop policy if exists "staff correct attendance" on public.attendance_records;
drop policy if exists "students create own leave requests" on public.leave_requests;
drop policy if exists "students read own leave, staff read all" on public.leave_requests;
drop policy if exists "admin and teacher review leave" on public.leave_requests;
drop policy if exists "authenticated read notices" on public.notices;
drop policy if exists "staff publish notices" on public.notices;
drop policy if exists "admin reads audit logs" on public.audit_logs;

-- Profiles: students see only themselves; teachers see students in assigned
-- classes; admins see/manage all profiles. Users cannot change their own role.
create policy "profile_select_self_assigned_or_admin"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or public.is_admin()
  or (
    public.is_teacher()
    and role = 'student'
    and exists (
      select 1 from public.teacher_assignments a
      join public.subjects s on s.id = a.subject_id
      where a.teacher_id = (select auth.uid())
        and s.department = profiles.department
        and s.academic_year = profiles.academic_year
        and s.semester = profiles.semester
        and s.section = coalesce(profiles.section, 'A')
    )
  )
);

create policy "profile_admin_insert"
on public.profiles for insert to authenticated
with check (public.is_admin());

create policy "profile_admin_update"
on public.profiles for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "profile_admin_delete"
on public.profiles for delete to authenticated
using (public.is_admin());

-- Subjects: students see active subjects in their own cohort; teachers see
-- assigned subjects; admins see all and manage them.
create policy "subject_select_scoped"
on public.subjects for select to authenticated
using (
  public.is_admin()
  or (is_active and public.teacher_has_subject(id))
  or (
    is_active and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'student' and p.is_active
        and p.department = subjects.department
        and p.academic_year = subjects.academic_year
        and p.semester = subjects.semester
        and coalesce(p.section, 'A') = subjects.section
    )
  )
);

create policy "subject_admin_insert"
on public.subjects for insert to authenticated with check (public.is_admin());
create policy "subject_admin_update"
on public.subjects for update to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "subject_admin_delete"
on public.subjects for delete to authenticated using (public.is_admin());

-- Teacher assignments are visible to their owner and admins; only admins
-- can create, change or remove assignments.
create policy "assignment_select_owner_or_admin"
on public.teacher_assignments for select to authenticated
using (teacher_id = (select auth.uid()) or public.is_admin());
create policy "assignment_admin_insert"
on public.teacher_assignments for insert to authenticated with check (public.is_admin());
create policy "assignment_admin_update"
on public.teacher_assignments for update to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "assignment_admin_delete"
on public.teacher_assignments for delete to authenticated using (public.is_admin());

-- Sessions: students can read sessions for their cohort; teachers only their
-- assigned subjects; admins all. Teachers may create sessions only for
-- assigned subjects and cannot set them as locked on creation.
create policy "session_select_scoped"
on public.attendance_sessions for select to authenticated
using (
  public.is_admin()
  or (teacher_id = (select auth.uid()) and public.teacher_has_subject(subject_id))
  or exists (
    select 1 from public.subjects s
    join public.profiles p
      on p.id = (select auth.uid())
     and p.role = 'student' and p.is_active
     and p.department = s.department
     and p.academic_year = s.academic_year
     and p.semester = s.semester
     and coalesce(p.section, 'A') = s.section
    where s.id = attendance_sessions.subject_id and s.is_active
  )
);

create policy "session_teacher_insert_assigned"
on public.attendance_sessions for insert to authenticated
with check (
  public.is_admin()
  or (
    teacher_id = (select auth.uid())
    and public.is_teacher()
    and public.teacher_has_subject(subject_id)
    and locked = false
  )
);

create policy "session_update_teacher_unlocked_or_admin"
on public.attendance_sessions for update to authenticated
using (
  public.is_admin()
  or (
    teacher_id = (select auth.uid())
    and public.is_teacher()
    and public.teacher_has_subject(subject_id)
    and locked = false
  )
)
with check (
  public.is_admin()
  or (
    teacher_id = (select auth.uid())
    and public.is_teacher()
    and public.teacher_has_subject(subject_id)
  )
);

create policy "session_admin_delete"
on public.attendance_sessions for delete to authenticated using (public.is_admin());

-- Attendance records: students read only their own; teachers read records only
-- from assigned subjects and only students belonging to that subject cohort.
-- Teachers can insert/update only while the parent session is unlocked.
create policy "attendance_select_scoped"
on public.attendance_records for select to authenticated
using (
  student_id = (select auth.uid())
  or public.is_admin()
  or exists (
    select 1 from public.attendance_sessions ses
    where ses.id = attendance_records.session_id
      and public.is_teacher()
      and ses.teacher_id = (select auth.uid())
      and public.teacher_has_subject(ses.subject_id)
      and public.student_in_subject_class(attendance_records.student_id, ses.subject_id)
  )
);

create policy "attendance_insert_assigned_unlocked"
on public.attendance_records for insert to authenticated
with check (
  public.is_admin()
  or exists (
    select 1 from public.attendance_sessions ses
    where ses.id = attendance_records.session_id
      and ses.locked = false
      and ses.teacher_id = (select auth.uid())
      and public.is_teacher()
      and public.teacher_has_subject(ses.subject_id)
      and public.student_in_subject_class(attendance_records.student_id, ses.subject_id)
      and marked_by = (select auth.uid())
  )
);

create policy "attendance_update_assigned_unlocked"
on public.attendance_records for update to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.attendance_sessions ses
    where ses.id = attendance_records.session_id
      and ses.locked = false
      and ses.teacher_id = (select auth.uid())
      and public.is_teacher()
      and public.teacher_has_subject(ses.subject_id)
      and public.student_in_subject_class(attendance_records.student_id, ses.subject_id)
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.attendance_sessions ses
    where ses.id = attendance_records.session_id
      and ses.locked = false
      and ses.teacher_id = (select auth.uid())
      and public.is_teacher()
      and public.teacher_has_subject(ses.subject_id)
      and public.student_in_subject_class(attendance_records.student_id, ses.subject_id)
      and marked_by = (select auth.uid())
  )
);

create policy "attendance_admin_delete"
on public.attendance_records for delete to authenticated using (public.is_admin());

-- Leave: students create/read only their own; teachers may review only
-- assigned cohort students; admins may review all. Teacher review scope uses
-- their subject assignments.
create policy "leave_insert_own_student"
on public.leave_requests for insert to authenticated
with check (student_id = (select auth.uid()) and public.is_active_student());

create policy "leave_select_scoped"
on public.leave_requests for select to authenticated
using (
  student_id = (select auth.uid())
  or public.is_admin()
  or (
    public.is_teacher()
    and exists (
      select 1 from public.profiles p
      join public.teacher_assignments a on a.teacher_id = (select auth.uid())
      join public.subjects s on s.id = a.subject_id
      where p.id = leave_requests.student_id
        and p.department = s.department
        and p.academic_year = s.academic_year
        and p.semester = s.semester
        and coalesce(p.section, 'A') = s.section
    )
  )
);

create policy "leave_review_scoped"
on public.leave_requests for update to authenticated
using (
  public.is_admin()
  or (
    public.is_teacher()
    and exists (
      select 1 from public.profiles p
      join public.teacher_assignments a on a.teacher_id = (select auth.uid())
      join public.subjects s on s.id = a.subject_id
      where p.id = leave_requests.student_id
        and p.department = s.department
        and p.academic_year = s.academic_year
        and p.semester = s.semester
        and coalesce(p.section, 'A') = s.section
    )
  )
)
with check (
  public.is_admin()
  or (
    public.is_teacher()
    and reviewed_by = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      join public.teacher_assignments a on a.teacher_id = (select auth.uid())
      join public.subjects s on s.id = a.subject_id
      where p.id = leave_requests.student_id
        and p.department = s.department
        and p.academic_year = s.academic_year
        and p.semester = s.semester
        and coalesce(p.section, 'A') = s.section
    )
  )
);

create policy "leave_admin_delete"
on public.leave_requests for delete to authenticated using (public.is_admin());

-- Notices: authenticated users read; only admins publish/manage. (If faculty
-- notices are required later, add an explicit teacher-scoped policy.)
create policy "notice_read_authenticated"
on public.notices for select to authenticated using (true);
create policy "notice_admin_insert"
on public.notices for insert to authenticated with check (public.is_admin());
create policy "notice_admin_update"
on public.notices for update to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "notice_admin_delete"
on public.notices for delete to authenticated using (public.is_admin());

-- Audit logs: admins can read; inserts are server-side only (service role or
-- a vetted database function), preventing users from forging audit events.
create policy "audit_admin_read"
on public.audit_logs for select to authenticated using (public.is_admin());

commit;

-- Deployment checklist:
-- 1) Test all policies with separate student, teacher and admin Auth users.
-- 2) Confirm profiles are provisioned by a trusted admin/server workflow.
-- 3) Do not allow public sign-up to choose or edit role.
-- 4) Roll out only after testing in a non-production Supabase project.
-- 5) For attendance corrections after lock, implement an audited admin
--    correction workflow rather than allowing teachers to bypass locked=true.
