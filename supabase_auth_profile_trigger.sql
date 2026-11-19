-- MITS: create a basic Student profile after email signup.
-- Public signups are ALWAYS students. Teachers/Admins must be created and
-- assigned by an authorized MITS administrator. Run once in Supabase SQL Editor.

create or replace function public.handle_new_mits_student()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, role, email, is_active)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'New Student'),
    'student',
    new.email,
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_mits on auth.users;
create trigger on_auth_user_created_mits
after insert on auth.users
for each row execute function public.handle_new_mits_student();
