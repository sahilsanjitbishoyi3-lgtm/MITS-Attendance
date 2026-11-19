-- MITS secure role and classroom PIN attendance migration
-- Apply after supabase_schema.sql in Supabase SQL Editor. Test with fictional accounts first.
create table if not exists public.teacher_class_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(teacher_id, subject_id)
);
alter table public.attendance_sessions
  add column if not exists pin_hash text,
  add column if not exists pin_expires_at timestamptz,
  add column if not exists pin_enabled boolean not null default false;
create index if not exists attendance_sessions_teacher_date_idx on public.attendance_sessions(teacher_id, session_date);
create index if not exists attendance_records_student_idx on public.attendance_records(student_id, session_id);

alter table public.teacher_class_assignments enable row level security;
drop policy if exists "profiles read self or admin/teacher" on public.profiles;
create policy "profiles read self admin or assigned teacher students"
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or public.current_role() = 'admin'
  or (public.current_role() = 'teacher' and exists (
    select 1 from public.teacher_class_assignments a
    join public.subjects s on s.id = a.subject_id
    where a.teacher_id = auth.uid() and a.is_active
      and s.department = profiles.department
      and s.academic_year = profiles.academic_year
      and s.section = profiles.section
  ))
);
drop policy if exists "authenticated read active subjects" on public.subjects;
create policy "subjects visible to assigned teacher or matching student"
on public.subjects for select to authenticated
using (
  public.current_role() = 'admin'
  or (public.current_role() = 'teacher' and exists (
    select 1 from public.teacher_class_assignments a
    where a.subject_id = subjects.id and a.teacher_id = auth.uid() and a.is_active
  ))
  or (public.current_role() = 'student' and is_active
    and department = (select p.department from public.profiles p where p.id = auth.uid())
    and academic_year = (select p.academic_year from public.profiles p where p.id = auth.uid())
    and section = (select p.section from public.profiles p where p.id = auth.uid()))
);
drop policy if exists "teachers and admin read sessions" on public.attendance_sessions;
create policy "staff read assigned sessions"
on public.attendance_sessions for select to authenticated
using (
  public.current_role() = 'admin'
  or (public.current_role() = 'teacher' and exists (
    select 1 from public.teacher_class_assignments a
    where a.subject_id = attendance_sessions.subject_id
      and a.teacher_id = auth.uid() and a.is_active
  ))
);
drop policy if exists "teacher creates own sessions" on public.attendance_sessions;
drop policy if exists "teacher updates own unlocked sessions or admin" on public.attendance_sessions;
create policy "admin manages sessions"
on public.attendance_sessions for all to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');
drop policy if exists "students read own attendance and staff read" on public.attendance_records;
create policy "student own or staff assigned attendance read"
on public.attendance_records for select to authenticated
using (
  student_id = auth.uid()
  or public.current_role() = 'admin'
  or (public.current_role() = 'teacher' and exists (
    select 1 from public.attendance_sessions ss
    join public.teacher_class_assignments a on a.subject_id = ss.subject_id
    where ss.id = attendance_records.session_id and a.teacher_id = auth.uid() and a.is_active
  ))
);
drop policy if exists "staff mark attendance" on public.attendance_records;
drop policy if exists "staff correct attendance" on public.attendance_records;
create policy "admin manage attendance records"
on public.attendance_records for all to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');
drop policy if exists "admin manages teacher assignments" on public.teacher_class_assignments;
create policy "admin manages teacher assignments"
on public.teacher_class_assignments for all to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');
create policy "teacher reads own assignments"
on public.teacher_class_assignments for select to authenticated
using (teacher_id = auth.uid() or public.current_role() = 'admin');

-- Only these RPCs may create/modify student attendance. PINs are never stored in plaintext.
create or replace function public.create_classroom_pin(p_subject_id uuid, p_period_no integer default null)
returns table(session_id uuid, classroom_pin text, expires_at timestamptz)
language plpgsql security definer set search_path = public, extensions
as $$
declare v_subject public.subjects%rowtype; v_pin text; v_session uuid; v_exp timestamptz;
begin
  if auth.uid() is null or public.current_role() not in ('teacher','admin') then
    raise exception 'Not authorized';
  end if;
  select * into v_subject from public.subjects where id = p_subject_id and is_active;
  if not found then raise exception 'Subject not found'; end if;
  if public.current_role() = 'teacher' and not exists (
    select 1 from public.teacher_class_assignments a
    where a.teacher_id = auth.uid() and a.subject_id = p_subject_id and a.is_active
  ) then raise exception 'You are not assigned to this subject'; end if;
  v_pin := lpad((floor(random()*1000000))::int::text,6,'0');
  v_exp := now() + interval '10 minutes';
  insert into public.attendance_sessions(subject_id,teacher_id,session_date,period_no,pin_hash,pin_expires_at,pin_enabled)
  values(p_subject_id,auth.uid(),current_date,p_period_no,crypt(v_pin,gen_salt('bf')),v_exp,true)
  returning id into v_session;
  return query select v_session,v_pin,v_exp;
end $$;

create or replace function public.submit_classroom_pin(p_pin text)
returns uuid language plpgsql security definer set search_path = public, extensions
as $$
declare v_profile public.profiles%rowtype; v_session public.attendance_sessions%rowtype; v_subject public.subjects%rowtype;
begin
  if auth.uid() is null or public.current_role() <> 'student' then raise exception 'Student login required'; end if;
  if p_pin !~ '^[0-9]{6}$' then raise exception 'Enter a valid 6-digit PIN'; end if;
  select * into v_profile from public.profiles where id = auth.uid() and is_active;
  select ss.* into v_session from public.attendance_sessions ss
    where ss.pin_enabled and ss.pin_expires_at > now()
      and ss.session_date = current_date and ss.pin_hash = crypt(p_pin, ss.pin_hash)
    order by ss.created_at desc limit 1;
  if not found then raise exception 'PIN is invalid or expired'; end if;
  select * into v_subject from public.subjects where id = v_session.subject_id;
  if v_profile.department is distinct from v_subject.department
    or v_profile.academic_year is distinct from v_subject.academic_year
    or v_profile.section is distinct from v_subject.section then
    raise exception 'This PIN is not for your class';
  end if;
  insert into public.attendance_records(session_id,student_id,status,marked_by)
  values(v_session.id,auth.uid(),'present',auth.uid())
  on conflict (session_id,student_id) do nothing;
  if not found then raise exception 'Attendance already submitted'; end if;
  return v_session.id;
end $$;

create or replace function public.teacher_set_attendance(p_session_id uuid,p_student_id uuid,p_status public.attendance_status)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.current_role() not in ('teacher','admin') then raise exception 'Not authorized'; end if;
  if public.current_role() = 'teacher' and not exists (
    select 1 from public.attendance_sessions ss
    join public.teacher_class_assignments a on a.subject_id=ss.subject_id
    where ss.id=p_session_id and a.teacher_id=auth.uid() and a.is_active and not ss.locked
  ) then raise exception 'Not assigned to this class or session is locked'; end if;
  if not exists (
    select 1 from public.attendance_sessions ss join public.subjects s on s.id=ss.subject_id
    join public.profiles p on p.id=p_student_id
    where ss.id=p_session_id and p.department=s.department
      and p.academic_year=s.academic_year and p.section=s.section
  ) then raise exception 'Student does not belong to this class'; end if;
  insert into public.attendance_records(session_id,student_id,status,marked_by)
  values(p_session_id,p_student_id,p_status,auth.uid())
  on conflict(session_id,student_id) do update
    set status=excluded.status, marked_at=now(), marked_by=auth.uid();
end $$;

revoke all on function public.create_classroom_pin(uuid,integer) from public;
revoke all on function public.submit_classroom_pin(text) from public;
revoke all on function public.teacher_set_attendance(uuid,uuid,public.attendance_status) from public;
grant execute on function public.create_classroom_pin(uuid,integer) to authenticated;
grant execute on function public.submit_classroom_pin(text) to authenticated;
grant execute on function public.teacher_set_attendance(uuid,uuid,public.attendance_status) to authenticated;

-- Prevent direct student/teacher writes that bypass the validated RPCs.
revoke insert, update, delete on public.attendance_records from authenticated;
