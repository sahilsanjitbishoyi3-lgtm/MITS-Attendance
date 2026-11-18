# MITS Attendance Portal — Version 2 setup

## Your selected configuration
- Institution: Majhighariani Institute of Technology and Science (MITS)
- Login identifier: email **or** student roll number + password
- Academic duration: 4 years (8 semesters)
- Attendance warning threshold: 75%
- Frontend hosting: GitHub Pages

## Features in the current downloadable prototype
- Admin / Teacher / Student workspace preview
- Attendance register with department, year, section and date filters
- Present, Absent and Late marking, including bulk marking
- Student directory and add-student workflow
- Attendance summary and CSV export
- Timetable, notices and leave request workflow
- Browser-local demo storage

## Important distinction
The included website is a front-end prototype. Its role selector is a preview, not a secure login. Browser storage is local to one browser and does not synchronize between teachers and students. Do not enter real student data yet.

GitHub Pages hosts static files; it does not provide a secure shared database or authentication by itself. The recommended arrangement is:
**GitHub Pages (website) + Supabase (authentication and database).**

The included `supabase_schema.sql` is a starter database schema and row-level-security baseline. It must be reviewed and tested by the college's authorized technical administrator before real deployment. In particular, teacher access should be restricted to assigned classes, student-to-profile mapping must be verified, and privileged admin creation must happen securely.

## Step-by-step: publish the prototype on GitHub Pages
1. Download and extract `MITS-Attendance-Website-v2.zip`.
2. Open your GitHub repository (or create a repository named `mits-attendance`).
3. Click **Add file → Upload files**.
4. Upload `index.html`, `style.css`, `script.js`, and `README.md` from the extracted project. Also upload `supabase_schema.sql` for safekeeping (it is not executed by GitHub Pages).
5. Scroll down and click **Commit changes**.
6. Open **Settings → Pages**.
7. Under **Build and deployment**, choose **Deploy from a branch**.
8. Choose branch **main** and folder **/(root)**, then click **Save**.
9. Wait for GitHub Pages to publish. Open the Pages URL shown in Settings → Pages.

## Step-by-step: prepare the shared database
1. Create a Supabase project under an account controlled by the institution.
2. Open **SQL Editor → New query**.
3. Copy the contents of `supabase_schema.sql`, review it, and run it.
4. Open **Authentication → Providers** and enable Email authentication.
5. Decide the official student email/roll-number identity mapping and account provisioning process.
6. Create a test admin account. Have the authorized administrator set that user's `profiles.role` to `admin` using the dashboard/secure server-side process.
7. Add test teacher and student profiles, subjects, sections and teacher assignments.
8. Test that a student can only read their own attendance, a teacher can only manage assigned classes, and an admin can manage institutional records.
9. Only after security testing should the website's login and data layer be connected to the Supabase project.

## Selected future feature roadmap
1. Secure login: email or roll number + password, password reset and session logout.
2. Role permissions: Admin, Teacher and Student, enforced in database policies.
3. Academic structure: 4 years / 8 semesters, departments, subjects and sections.
4. Attendance: subject-wise sessions, Present / Absent / Late / Excused, edit history and duplicate-session prevention.
5. Student portal: own daily, monthly, semester and annual attendance; 75% shortage warning.
6. QR attendance: teacher-generated time-limited session QR, with server-side validation and duplicate prevention. Do not rely on a static QR as proof of physical presence.
7. Leave requests: student application, teacher/admin review and attendance correction workflow.
8. Reports: CSV/PDF, department/year/semester/subject filters and audit trail.
9. Notices and timetable: audience-specific notices and faculty/class schedules.
10. Reliability: backups, HTTPS, rate limits, audit logs and privacy controls.

## Before the live system is used
Confirm official department names, semester names, section labels, subject codes, attendance rules, class periods, teacher assignments and who is authorized to approve corrections. Use fictional test data until the security checks are complete.
