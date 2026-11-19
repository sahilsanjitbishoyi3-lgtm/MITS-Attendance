# Supabase integration setup

1. Create or select the institution-owned Supabase project.
2. In SQL Editor, run the existing `supabase_schema.sql` first, then run `supabase/migrations/202611190001_secure_classroom_pin.sql`.
3. Copy `supabase-config.example.js` to `supabase-config.js` and fill in the Project URL and publishable/anon key from Project Settings → API.
4. Add `supabase-config.js` to the deployment root. Do not commit private keys. The publishable/anon key is safe to expose only when RLS is correctly enabled.
5. Create users in Supabase Auth, then create their matching `profiles` rows through a trusted admin process. Never allow public signup to choose an admin/teacher role.
6. Admins create subjects and assign teachers in `teacher_class_assignments`.
7. Test using separate student, teacher, and admin accounts with fake data. Verify students cannot read others' records and teachers cannot access unassigned classes.
8. Configure email confirmation and password reset before launch.

GitHub Pages is static hosting. It cannot keep secrets or perform trusted account provisioning. Do not use a service-role key in browser code. The SQL migration adds database-validated, expiring 6-digit PINs and RPCs; the web UI must call those RPCs using the signed-in user's Supabase session.
