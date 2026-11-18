# MITS Smart Attendance Portal

A premium-styled, responsive college attendance website prototype for **Majhighariani Institute of Technology and Science (MITS)**.

## Included features
- Role-view switcher for Admin, Teacher and Student (demo view only)
- Dashboard with attendance summary and department chart
- Attendance register filtered by department, academic year, section and date
- Present / Absent / Late statuses and bulk marking
- Student directory and add-student form
- Attendance reports with filters and CSV export
- Weekly timetable sample
- College notice board and publish-notice form
- Leave request form and approve/reject actions
- Browser localStorage persistence and reset-demo control
- Responsive layout for desktop, tablet and mobile

## Run it
1. Download and unzip the project.
2. Open `index.html` in Chrome, Edge, Firefox or Safari.
3. For GitHub Pages, upload `index.html`, `style.css`, `script.js`, and this README to the repository root, then enable Pages from **Settings → Pages**.

## Important: prototype vs production
This version is a working front-end prototype. It stores records in the current browser only. The role switcher is for previewing the three dashboards; it is **not authentication or access control**. Do not enter real student personal data or use this as the official attendance register yet.

For a real college deployment, connect a secure backend such as Supabase or a college server:
- Auth: individual accounts, password reset, optional MFA
- Roles: admin, faculty, student enforced by database policies (not just UI)
- Database: students, departments, academic_years, subjects, class_sections, timetables, attendance_sessions, attendance_records, leave_requests, notices, audit_logs
- Security: row-level security, server-side validation, audit trail, backups, HTTPS
- Attendance rules: lock edits after a configurable time; correction requests; duplicate-session prevention
- Privacy: restrict students to their own records; teachers to assigned classes; admin to approved institutional scope

## Suggested production data model
- `profiles(id, full_name, role, email, phone)`
- `students(id, roll_no, department_id, academic_year_id, section_id, profile_id, status)`
- `faculty(id, profile_id, department_id)`
- `subjects(id, subject_code, subject_name, department_id, semester)`
- `class_assignments(id, faculty_id, subject_id, section_id)`
- `attendance_sessions(id, subject_id, section_id, faculty_id, session_date, period_no, status)`
- `attendance_records(id, session_id, student_id, attendance_status, marked_at, updated_by)`
- `leave_requests(id, student_id, from_date, to_date, reason, status, reviewed_by)`
- `notices(id, title, body, audience, published_by, published_at)`
- `audit_logs(id, actor_id, action, entity, entity_id, created_at)`

## Next step
Before using real data, decide the official department list, year/semester structure, sections, attendance policy (for example, 75% threshold), and whether students log in with roll number/email. Then configure backend authentication and database policies.

## Visual design
Premium private-college look: midnight navy, muted champagne-gold accents, warm ivory surfaces, refined serif display headings, spacious dashboard cards and responsive navigation.


## College branding
The official MITS logo is included as `mits-logo.png` and is used in the sidebar and browser tab icon. Keep this image in the same folder as `index.html` when deploying.


## Header devotional image
The supplied deity photograph is included as `deity-header.png` and displayed at the right side of the top header. Keep this image in the same folder as `index.html` when deploying.
