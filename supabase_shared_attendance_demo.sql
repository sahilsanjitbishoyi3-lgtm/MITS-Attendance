-- MITS shared attendance-code DEMO setup.
-- Run once in Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Demo only: public anonymous access is intentionally enabled. Use fictional/sample data only.

create table if not exists public.mits_demo_students (
  roll_no text primary key,
  full_name text not null,
  department text not null,
  academic_year text not null,
  section text not null
);

insert into public.mits_demo_students(roll_no,full_name,department,academic_year,section) values
('MITS001','Aarav Mohanty','Computer Science','1st Year','A'),
('MITS002','Ananya Sahu','Computer Science','1st Year','A'),
('MITS003','Rohan Patnaik','Computer Science','1st Year','A'),
('MITS004','Priya Das','Computer Science','1st Year','A'),
('MITS005','Sourav Behera','Computer Science','1st Year','A'),
('MITS006','Sneha Nayak','Mechanical','2nd Year','B'),
('MITS007','Aditya Jena','Mechanical','2nd Year','B'),
('MITS008','Pooja Rout','Electrical','3rd Year','A'),
('MITS009','Kunal Mishra','Civil','4th Year','C'),
('MITS010','Isha Pradhan','Electronics','2nd Year','A'),
('MITS011','Manas Panda','Computer Science','1st Year','A'),
('MITS012','Diya Swain','Computer Science','1st Year','A')
on conflict (roll_no) do update set full_name=excluded.full_name, department=excluded.department, academic_year=excluded.academic_year, section=excluded.section;

create table if not exists public.mits_demo_sessions (
  id uuid primary key default gen_random_uuid(),
  attendance_code text not null unique,
  subject text not null,
  department text not null,
  academic_year text not null,
  section text not null,
  session_date date not null default current_date,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.mits_demo_checkins (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.mits_demo_sessions(id) on delete cascade,
  roll_no text not null references public.mits_demo_students(roll_no),
  full_name text not null,
  status text not null default 'Present',
  submitted_at timestamptz not null default now(),
  unique(session_id, roll_no)
);

alter table public.mits_demo_students enable row level security;
alter table public.mits_demo_sessions enable row level security;
alter table public.mits_demo_checkins enable row level security;
revoke all on public.mits_demo_students, public.mits_demo_sessions, public.mits_demo_checkins from anon, authenticated;

create or replace function public.mits_demo_create_session(p_code text,p_subject text,p_department text,p_year text,p_section text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v public.mits_demo_sessions;
begin
 if length(coalesce(p_code,'')) <> 6 or p_code !~ '^[0-9]{6}$' then raise exception 'Invalid attendance code'; end if;
 if length(trim(coalesce(p_subject,''))) = 0 then raise exception 'Enter a subject'; end if;
 insert into public.mits_demo_sessions(attendance_code,subject,department,academic_year,section,expires_at)
 values(p_code,trim(p_subject),p_department,p_year,p_section,now()+interval '2 hours')
 returning * into v;
 return jsonb_build_object('id',v.id,'code',v.attendance_code,'subject',v.subject,'department',v.department,'academic_year',v.academic_year,'section',v.section,'session_date',v.session_date,'expires_at',v.expires_at);
end; $$;

create or replace function public.mits_demo_submit_attendance(p_roll text,p_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s public.mits_demo_sessions; st public.mits_demo_students; c public.mits_demo_checkins;
begin
 select * into s from public.mits_demo_sessions where attendance_code=trim(p_code) and session_date=current_date and expires_at>now() order by created_at desc limit 1;
 if not found then raise exception 'Attendance code is invalid or expired'; end if;
 select * into st from public.mits_demo_students where upper(roll_no)=upper(trim(p_roll));
 if not found then raise exception 'Roll number not found in demo student list'; end if;
 if st.department<>s.department or st.academic_year<>s.academic_year or st.section<>s.section then raise exception 'This code is for a different class'; end if;
 insert into public.mits_demo_checkins(session_id,roll_no,full_name,status)
 values(s.id,st.roll_no,st.full_name,'Present') on conflict(session_id,roll_no) do nothing returning * into c;
 if c.id is null then raise exception 'Attendance already submitted for this student and subject'; end if;
 return jsonb_build_object('success',true,'name',st.full_name,'roll_no',st.roll_no,'subject',s.subject);
end; $$;

create or replace function public.mits_demo_get_attendance(p_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s public.mits_demo_sessions; result jsonb;
begin
 select * into s from public.mits_demo_sessions where attendance_code=trim(p_code) order by created_at desc limit 1;
 if not found then raise exception 'Session not found'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('roll_no',c.roll_no,'full_name',c.full_name,'status',c.status,'submitted_at',c.submitted_at) order by c.submitted_at), '[]'::jsonb)
 into result from public.mits_demo_checkins c where c.session_id=s.id;
 return jsonb_build_object('subject',s.subject,'department',s.department,'academic_year',s.academic_year,'section',s.section,'session_date',s.session_date,'expires_at',s.expires_at,'attendance',result);
end; $$;

revoke all on function public.mits_demo_create_session(text,text,text,text,text) from public;
revoke all on function public.mits_demo_submit_attendance(text,text) from public;
revoke all on function public.mits_demo_get_attendance(text) from public;
grant execute on function public.mits_demo_create_session(text,text,text,text,text) to anon, authenticated;
grant execute on function public.mits_demo_submit_attendance(text,text) to anon, authenticated;
grant execute on function public.mits_demo_get_attendance(text) to anon, authenticated;
