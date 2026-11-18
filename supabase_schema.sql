-- MITS Smart Attendance Portal: Supabase starter schema
-- Run in Supabase SQL Editor only after creating a new project.
-- Review with your institution's IT/admin team before using real student data.

create extension if not exists pgcrypto;

create type public.app_role as enum ('admin','teacher','student');
create type public.attendance_status as enum ('present','absent','late','excused');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'student',
  email text unique,
  roll_no text unique,
  department text,
  academic_year int check (academic_year between 1 and 4),
  semester int check (semester between 1 and 8),
  section text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  subject_code text not null unique,
  subject_name text not null,
  department text not null,
  academic_year int not null check (academic_year between 1 and 4),
  semester int not null check (semester between 1 and 8),
  section text not null default 'A',
  teacher_id uuid references public.profiles(id),
  is_active boolean not null default true
);

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id),
  teacher_id uuid not null references public.profiles(id),
  session_date date not null,
  period_no int,
  session_code text unique,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  unique(subject_id, session_date, period_no)
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id),
  status public.attendance_status not null,
  marked_at timestamptz not null default now(),
  marked_by uuid references public.profiles(id),
  unique(session_id, student_id)
);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id),
  from_date date not null,
  to_date date not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (to_date >= from_date)
);

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'all' check (audience in ('all','students','teachers')),
  published_by uuid references public.profiles(id),
  published_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity text not null,
  entity_id text,
  created_at timestamptz not null default now()
);

-- Enable RLS. Policies below are a conservative starting point; extend carefully.
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.leave_requests enable row level security;
alter table public.notices enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_role()
returns public.app_role language sql stable security definer
set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create policy "profiles read self or admin/teacher"
on public.profiles for select to authenticated
using (id = auth.uid() or public.current_role() in ('admin','teacher'));

create policy "admin manages profiles"
on public.profiles for all to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

create policy "authenticated read active subjects"
on public.subjects for select to authenticated using (is_active = true);

create policy "admin manages subjects"
on public.subjects for all to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

create policy "teachers and admin read sessions"
on public.attendance_sessions for select to authenticated
using (teacher_id = auth.uid() or public.current_role() = 'admin');

create policy "teacher creates own sessions"
on public.attendance_sessions for insert to authenticated
with check (teacher_id = auth.uid() and public.current_role() in ('teacher','admin'));

create policy "teacher updates own unlocked sessions or admin"
on public.attendance_sessions for update to authenticated
using ((teacher_id = auth.uid() and locked = false) or public.current_role() = 'admin')
with check ((teacher_id = auth.uid()) or public.current_role() = 'admin');

create policy "students read own attendance and staff read"
on public.attendance_records for select to authenticated
using (student_id = auth.uid() or public.current_role() in ('admin','teacher'));

create policy "staff mark attendance"
on public.attendance_records for insert to authenticated
with check (public.current_role() in ('teacher','admin'));

create policy "staff correct attendance"
on public.attendance_records for update to authenticated
using (public.current_role() in ('teacher','admin'))
with check (public.current_role() in ('teacher','admin'));

create policy "students create own leave requests"
on public.leave_requests for insert to authenticated
with check (student_id = auth.uid());

create policy "students read own leave, staff read all"
on public.leave_requests for select to authenticated
using (student_id = auth.uid() or public.current_role() in ('teacher','admin'));

create policy "admin and teacher review leave"
on public.leave_requests for update to authenticated
using (public.current_role() in ('teacher','admin'))
with check (public.current_role() in ('teacher','admin'));

create policy "authenticated read notices"
on public.notices for select to authenticated using (true);

create policy "staff publish notices"
on public.notices for insert to authenticated
with check (public.current_role() in ('teacher','admin'));

create policy "admin reads audit logs"
on public.audit_logs for select to authenticated
using (public.current_role() = 'admin');

-- Important: create the first admin profile securely from the Supabase dashboard
-- after creating that user's Auth account. Never expose the service_role key in
-- frontend code. Review/strengthen policies for assigned-class access before launch.
