const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const departments=['Computer Science','Mechanical','Electrical','Civil','Electronics'];
const seed=[
['MITS001','Aarav Mohanty','Computer Science','1st Year','A','9876500001'],['MITS002','Ananya Sahu','Computer Science','1st Year','A','9876500002'],['MITS003','Rohan Patnaik','Computer Science','1st Year','A','9876500003'],['MITS004','Priya Das','Computer Science','1st Year','A','9876500004'],['MITS005','Sourav Behera','Computer Science','1st Year','A','9876500005'],['MITS006','Sneha Nayak','Mechanical','2nd Year','B','9876500006'],['MITS007','Aditya Jena','Mechanical','2nd Year','B','9876500007'],['MITS008','Pooja Rout','Electrical','3rd Year','A','9876500008'],['MITS009','Kunal Mishra','Civil','4th Year','C','9876500009'],['MITS010','Isha Pradhan','Electronics','2nd Year','A','9876500010'],['MITS011','Manas Panda','Computer Science','1st Year','A','9876500011'],['MITS012','Diya Swain','Computer Science','1st Year','A','9876500012']
].map(a=>({roll:a[0],name:a[1],dept:a[2],year:a[3],section:a[4],phone:a[5]}));
const get=(k,d)=>{try{return JSON.parse(localStorage.getItem('mits_'+k))??d}catch{return d}};
let students=get('students',seed), records=get('records',[]), notices=get('notices',[{title:'Welcome to MITS Smart Attendance Portal',body:'This portal helps students and faculty track attendance, academic notices and leave requests. Please check your attendance regularly.',date:'18 Nov 2026'},{title:'Attendance policy reminder',body:'Students are advised to maintain the attendance percentage required by their department. Contact your class teacher for corrections.',date:'15 Nov 2026'}]), leaves=get('leaves',[]);
function save(){localStorage.setItem('mits_students',JSON.stringify(students));localStorage.setItem('mits_records',JSON.stringify(records));localStorage.setItem('mits_notices',JSON.stringify(notices));localStorage.setItem('mits_leaves',JSON.stringify(leaves))}
function toast(m){let t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2300)}
function role(){return $('#roleSelect').value}
function navigate(v){$$('.view').forEach(x=>x.classList.toggle('active',x.id===v));$$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===v));$('#pageTitle').textContent=({dashboard:'Dashboard',attendance:'Attendance',students:'Students',reports:'Reports & Analytics',timetable:'Timetable',notices:'Notice board',leave:'Leave requests'})[v];renderAll()}
$$('.nav-item').forEach(b=>b.onclick=()=>navigate(b.dataset.view));$$('[data-goto]').forEach(b=>b.onclick=()=>navigate(b.dataset.goto));
$('#roleSelect').onchange=()=>{$('#welcomeRole').textContent=role();$('#avatar').textContent=role()==='Admin'?'AD':role()==='Teacher'?'TR':'ST';renderAll();toast('Viewing '+role()+' demo workspace')};
function stat(){let today=records.filter(r=>r.date==='2026-11-18'),present=today.filter(r=>r.status==='Present').length;$('#totalStudents').textContent=students.length.toLocaleString();$('#presentToday').textContent=present||Math.round(students.length*.87);$('#absentToday').textContent=today.length?today.length-present:Math.round(students.length*.13);$('#presentPercent').textContent=(today.length?Math.round(present/today.length*100):87)+'% attendance';let depts=departments.map(d=>{let rs=today.filter(r=>r.dept===d);return [d,rs.length?Math.round(rs.filter(r=>r.status==='Present').length/rs.length*100):[91,86,88,82,89][departments.indexOf(d)]]});$('#departmentBars').innerHTML=depts.map(([d,p])=>`<div class="bar-row"><span>${d}</span><div class="bar-track"><div class="bar-fill" style="width:${p}%"></div></div><span class="bar-value">${p}%</span></div>`).join('');let recent=(records.length?records.slice(-5).reverse():students.slice(0,5).map(s=>({...s,date:'18 Nov 2026',status:'Present'})));$('#recentRows').innerHTML=recent.map(r=>`<tr><td><b>${esc(r.name)}</b></td><td>${esc(r.dept)}</td><td>${esc(r.year)}</td><td>${r.date}</td><td>${badge(r.status)}</td></tr>`).join('')}
function badge(s){return `<span class="status ${s.toLowerCase()}">${s}</span>`}function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function roster(){let d=$('#attDept').value,y=$('#attYear').value,sec=$('#attSection').value,date=$('#attDate').value,q=$('#studentSearch').value.toLowerCase();let list=students.filter(s=>s.dept===d&&s.year===y&&s.section===sec&&(`${s.name} ${s.roll}`).toLowerCase().includes(q));$('#rosterCount').textContent=`${list.length} students · ${date}`;$('#rosterRows').innerHTML=list.map(s=>{let r=records.find(x=>x.roll===s.roll&&x.date===date);return `<tr><td>${s.roll}</td><td><b>${esc(s.name)}</b></td><td>${s.dept}</td><td>${s.year} · ${s.section}</td><td><select class="attendance-select" data-roll="${s.roll}"><option ${(!r||r.status==='Present')?'selected':''}>Present</option><option ${r?.status==='Absent'?'selected':''}>Absent</option><option ${r?.status==='Late'?'selected':''}>Late</option></select></td></tr>`}).join('')||'<tr><td colspan="5">No students match these filters. Try another year, section or department.</td></tr>'}
['#attDept','#attYear','#attSection','#attDate','#studentSearch'].forEach(s=>$(s).addEventListener('input',roster));
function saveAtt(){let date=$('#attDate').value;$$('#rosterRows select').forEach(el=>{let s=students.find(x=>x.roll===el.dataset.roll);let r={...s,date,status:el.value};let i=records.findIndex(x=>x.roll===s.roll&&x.date===date);if(i>=0)records[i]=r;else records.push(r)});save();renderAll();toast('Attendance saved successfully')}
$('#saveAttendance').onclick=saveAtt;$('#markAllPresent').onclick=()=>{$$('#rosterRows select').forEach(x=>x.value='Present')};$('#markAllAbsent').onclick=()=>{$$('#rosterRows select').forEach(x=>x.value='Absent')};
function directory(){let q=$('#directorySearch').value.toLowerCase(),d=$('#dirDept').value,y=$('#dirYear').value;let a=students.filter(s=>(!d||s.dept===d)&&(!y||s.year===y)&&(`${s.name} ${s.roll}`).toLowerCase().includes(q));$('#directoryRows').innerHTML=a.map(s=>`<tr><td>${s.roll}</td><td><b>${esc(s.name)}</b></td><td>${s.dept}</td><td>${s.year}</td><td>${s.section}</td><td>${s.phone||'—'}</td></tr>`).join('')}
['#directorySearch','#dirDept','#dirYear'].forEach(s=>$(s).addEventListener('input',directory));
function reports(){let d=$('#reportDept').value,y=$('#reportYear').value,from=$('#reportFrom').value,to=$('#reportTo').value;let rs=records.filter(r=>(!d||r.dept===d)&&(!y||r.year===y)&&(!from||r.date>=from)&&(!to||r.date<=to));let present=rs.filter(r=>r.status==='Present').length;$('#reportSessions').textContent=rs.length;$('#reportPresent').textContent=present;$('#reportAverage').textContent=rs.length?Math.round(present/rs.length*100)+'%':'—';let grouped={};rs.forEach(r=>{grouped[r.roll]??={...r,n:0,p:0};grouped[r.roll].n++;if(r.status==='Present'||r.status==='Late')grouped[r.roll].p++});$('#reportRows').innerHTML=Object.values(grouped).map(r=>{let p=Math.round(r.p/r.n*100);return `<tr><td>${r.roll}</td><td>${esc(r.name)}</td><td>${r.n}</td><td>${r.p}</td><td><b>${p}%</b></td><td>${badge(p>=75?'Present':'Absent')}</td></tr>`}).join('')||'<tr><td colspan="6">No attendance records yet. Save a register to generate reports.</td></tr>'}
['#reportDept','#reportYear','#reportFrom','#reportTo'].forEach(s=>$(s).addEventListener('input',reports));
function noticeRender(){$('#noticeList').innerHTML=notices.slice().reverse().map(n=>`<article class="notice"><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p><small>Published · ${n.date}</small></article>`).join('')}
function leaveRender(){$('#leaveRows').innerHTML=leaves.map((l,i)=>`<tr><td>${esc(l.student)}</td><td>${l.from}</td><td>${l.to}</td><td>${esc(l.reason)}</td><td>${badge(l.status)}</td><td>${role()==='Admin'||role()==='Teacher'?`<button class="text-btn" onclick="updateLeave(${i},'Approved')">Approve</button> <button class="text-btn" onclick="updateLeave(${i},'Rejected')">Reject</button>`:'—'}</td></tr>`).join('')||'<tr><td colspan="6">No leave requests submitted.</td></tr>'}
window.updateLeave=(i,s)=>{leaves[i].status=s;save();leaveRender();toast('Leave request '+s.toLowerCase())};
function renderAll(){stat();roster();directory();reports();noticeRender();leaveRender()}
function openModal(title,html,handler){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=html;$('#modal').classList.add('open');$('#modalBody form').onsubmit=e=>{e.preventDefault();handler(new FormData(e.target));$('#modal').classList.remove('open')}}
$('#closeModal').onclick=()=>$('#modal').classList.remove('open');$('#modal').onclick=e=>{if(e.target.id==='modal')$('#modal').classList.remove('open')};
$('#addStudentBtn').onclick=()=>openModal('Add student',`<form><label>Student full name<input name="name" required></label><label>Roll number<input name="roll" required></label><label>Department<select name="dept">${departments.map(d=>`<option>${d}</option>`)}</select></label><label>Academic year<select name="year">${['1st Year','2nd Year','3rd Year','4th Year'].map(x=>`<option>${x}</option>`)}</select></label><label>Section<select name="section"><option>A</option><option>B</option><option>C</option></select></label><label>Contact number<input name="phone" inputmode="numeric"></label><button class="primary">Save student</button></form>`,f=>{if(students.some(s=>s.roll===f.get('roll'))){toast('Roll number already exists');return}students.push(Object.fromEntries(['name','roll','dept','year','section','phone'].map(k=>[k,f.get(k)])));save();renderAll();toast('Student added')});
$('#addNoticeBtn').onclick=()=>openModal('Publish notice',`<form><label>Notice title<input name="title" required></label><label>Message<textarea name="body" required></textarea></label><button class="primary">Publish notice</button></form>`,f=>{notices.push({title:f.get('title'),body:f.get('body'),date:new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})});save();noticeRender();toast('Notice published')});
$('#newLeaveBtn').onclick=()=>openModal('Apply for leave',`<form><label>Student name<input name="student" required></label><label>From date<input name="from" type="date" required></label><label>To date<input name="to" type="date" required></label><label>Reason<textarea name="reason" required></textarea></label><button class="primary">Submit request</button></form>`,f=>{leaves.push({student:f.get('student'),from:f.get('from'),to:f.get('to'),reason:f.get('reason'),status:'Pending'});save();leaveRender();toast('Leave request submitted')});
$('#exportCsv').onclick=()=>{let rows=[['Roll','Name','Department','Year','Date','Status'],...records.map(r=>[r.roll,r.name,r.dept,r.year,r.date,r.status])];let csv=rows.map(r=>r.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(',')).join('\n');let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='MITS-attendance-report.csv';a.click();URL.revokeObjectURL(a.href)};
$('#resetDemo').onclick=()=>{if(confirm('Reset all MITS demo data in this browser?')){['students','records','notices','leaves'].forEach(k=>localStorage.removeItem('mits_'+k));location.reload()}};
renderAll();


/* MITS opening screen actions — one delegated click handler */
function enterPortal(selectedRole){
 const roleSelect=document.querySelector('#roleSelect');
 if(!roleSelect)return;
 roleSelect.value=selectedRole;
 document.querySelector('#welcomeRole').textContent=selectedRole;
 document.querySelector('#avatar').textContent=selectedRole==='Admin'?'AD':selectedRole==='Teacher'?'TR':'ST';
 document.querySelector('#portalWelcome').style.display='none';
 renderAll();
}
document.addEventListener('click',function(event){
 const login=event.target.closest('[data-enter]');
 if(login){event.preventDefault();enterPortal(login.dataset.enter);return;}
 const signup=event.target.closest('[data-signup]');
 if(!signup)return;
 event.preventDefault();
 const selected=signup.dataset.signup;
 const title=selected==='Admin'?'Request administrator access':selected+' registration';
 const form=`<form><label>Full name<input name="name" required></label><label>Email address<input name="email" type="email" required></label>${selected==='Student'?'<label>Student roll number<input name="roll" required></label>':''}<label>Create password<input name="password" type="password" minlength="8" required></label><button class="primary" type="submit">${selected==='Admin'?'Send access request':'Create demo account'}</button><p style="font-size:11px;color:#877d8b;line-height:1.5">Demo only: this does not create a secure account. Supabase authentication will be connected later.</p></form>`;
 openModal(title,form,()=>toast(selected==='Admin'?'Admin access request preview only':'Signup preview only — secure account setup comes later.'));
});


/* MITS role-specific dashboard preview.
   This is presentation-only until Supabase identity and scoped queries are connected.
   Never treat the demo role selector or localStorage data as authorization. */
(function initRoleDashboardPreview(){
  const roleSelect = document.querySelector('#roleSelect');
  if (!roleSelect) return;
  const access = {
    Admin: ['dashboard','attendance','students','reports','timetable','notices','leave'],
    Teacher: ['dashboard','attendance','reports','timetable','notices','leave'],
    Student: ['dashboard','reports','timetable','notices','leave']
  };
  const titles = {
    Student: 'Student workspace · view only',
    Teacher: 'Teacher workspace · assigned classes only',
    Admin: 'Administrator workspace · full management'
  };
  function addPreviewNotice(){
    let note=document.getElementById('rolePreviewNotice');
    if(!note){
      note=document.createElement('div');
      note.id='rolePreviewNotice';
      note.style.cssText='margin:0 0 18px;padding:12px 15px;border:1px solid #e8d9a8;border-radius:12px;background:#fff9e9;color:#705b2c;font-size:12px;line-height:1.5';
      document.querySelector('.content')?.prepend(note);
    }
    const current=roleSelect.value;
    note.textContent=titles[current]+' — preview only. Secure account-based permissions and database filtering are not active yet. Do not enter real student information.';
  }
  function apply(){
    const current=roleSelect.value;
    const allowed=access[current]||access.Student;
    document.querySelectorAll('.nav-item').forEach(btn=>{
      const show=allowed.includes(btn.dataset.view);
      btn.hidden=!show;
      btn.setAttribute('aria-hidden',String(!show));
    });
    document.querySelectorAll('[data-goto]').forEach(btn=>{
      const show=allowed.includes(btn.dataset.goto);
      btn.hidden=!show;
    });
    // Student and teacher preview screens must not display college-wide demo rows.
    const restricted=current!=='Admin';
    ['#stats','#departmentBars','#recentRows','#rosterRows','#directoryRows','#reportRows','#leaveRows'].forEach(sel=>{
      const el=document.querySelector(sel);
      if(el && restricted) el.innerHTML='';
    });
    const total=document.querySelector('#totalStudents');
    if(total && current==='Student') total.textContent='—';
    const present=document.querySelector('#presentToday');
    if(present && current==='Student') present.textContent='—';
    const absent=document.querySelector('#absentToday');
    if(absent && current==='Student') absent.textContent='—';
    // Disable demo mutations for non-admin users until assignment-scoped database actions exist.
    ['#addStudentBtn','#addNoticeBtn','#resetDemo'].forEach(sel=>{
      const el=document.querySelector(sel);
      if(el) el.hidden=current!=='Admin';
    });
    ['#saveAttendance','#markAllPresent','#markAllAbsent'].forEach(sel=>{
      const el=document.querySelector(sel);
      if(el) el.hidden=current==='Student';
    });
    const addLeave=document.querySelector('#newLeaveBtn');
    if(addLeave) addLeave.hidden=current==='Admin';
    addPreviewNotice();
    const active=document.querySelector('.nav-item.active');
    if(active && active.hidden){
      const first=allowed[0];
      if(typeof navigate==='function') navigate(first);
    }
  }
  const oldNavigate=window.navigate;
  if(typeof oldNavigate==='function'){
    window.navigate=function(v){
      const allowed=access[roleSelect.value]||access.Student;
      if(!allowed.includes(v)){toast('This section is not available for this role.');return;}
      oldNavigate(v);
    };
  }
  roleSelect.addEventListener('change',apply);
  apply();
})();
