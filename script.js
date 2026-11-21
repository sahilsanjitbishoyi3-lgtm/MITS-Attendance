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
function navigate(v){$$('.view').forEach(x=>x.classList.toggle('active',x.id===v));$$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===v));$('#pageTitle').textContent=({dashboard:'Dashboard',attendance:'Attendance',teacherCode:'Teacher: Generate Code',checkin:'Join with Code',students:'Students',reports:'Reports & Analytics',timetable:'Timetable',notices:'Notice board',leave:'Leave requests'})[v];renderAll()}
$$('.nav-item').forEach(b=>b.onclick=()=>navigate(b.dataset.view));$$('[data-goto]').forEach(b=>b.onclick=()=>navigate(b.dataset.goto));
$('#roleSelect').onchange=()=>{$('#welcomeRole').textContent=role();$('#avatar').textContent=role()==='Admin'?'AD':role()==='Teacher'?'TR':'ST';renderAll();toast('Viewing '+role()+' demo workspace')};
function todayISO(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function stat(){
 const today=todayISO();
 const todayRecords=records.filter(r=>r.date===today);
 const present=todayRecords.filter(r=>r.status==='Present').length;
 const absent=todayRecords.filter(r=>r.status==='Absent').length;
 const late=todayRecords.filter(r=>r.status==='Late').length;
 const marked=todayRecords.length;
 const pct=marked?Math.round((present+late)/marked*100):0;
 $('#totalStudents').textContent=students.length.toLocaleString();
 $('#presentToday').textContent=present.toLocaleString();
 $('#absentToday').textContent=absent.toLocaleString();
 $('#presentPercent').textContent=marked?pct+'% of marked attendance': 'No attendance marked today';
 $('#classesToday').textContent=new Set(todayRecords.map(r=>[r.dept,r.year,r.section].join('|'))).size.toLocaleString();
 $('#classesTodaySub').textContent=marked?new Set(todayRecords.map(r=>r.dept)).size+' departments recorded':'Based on saved attendance';
 const dateLabel=new Date(today+'T00:00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase();
 const dateNode=$('#dashboardDate');if(dateNode)dateNode.textContent=dateLabel;
 const depts=departments.map(d=>{const rs=todayRecords.filter(r=>r.dept===d);return [d,rs.length?Math.round(rs.filter(r=>r.status==='Present'||r.status==='Late').length/rs.length*100):0]});
 $('#departmentBars').innerHTML=depts.map(([d,p])=>`<div class="bar-row"><span>${esc(d)}</span><div class="bar-track"><div class="bar-fill" style="width:${p}%"></div></div><span class="bar-value">${p}%</span></div>`).join('');
 const recent=records.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);
 $('#recentRows').innerHTML=recent.map(r=>`<tr><td><b>${esc(r.name)}</b></td><td>${esc(r.dept)}</td><td>${esc(r.year)}</td><td>${esc(r.date)}</td><td>${badge(r.status)}</td></tr>`).join('')||'<tr><td colspan="5">No attendance records saved yet.</td></tr>';
}

$('#attDate').value=todayISO();
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
function leaveRender(){
 const body=$('#leaveRows');if(!body)return;
 const canReview=role()==='Admin'||role()==='Teacher';
 body.innerHTML=leaves.map((l,i)=>{
  const status=String(l.status||'Pending');
  const action=canReview&&status==='Pending'
   ? '<button type="button" class="text-btn" data-leave-action="Approved" data-leave-index="'+i+'">Approve</button> <button type="button" class="text-btn" data-leave-action="Rejected" data-leave-index="'+i+'">Reject</button>'
   : (canReview?'<span class="muted">Completed</span>':'<span class="muted">View only</span>');
  return '<tr><td>'+esc(l.student)+'</td><td>'+esc(l.from)+'</td><td>'+esc(l.to)+'</td><td>'+esc(l.reason)+'</td><td>'+badge(status)+'</td><td>'+action+'</td></tr>';
 }).join('')||'<tr><td colspan="6">No leave requests submitted.</td></tr>';
}
bodyLeaveHandler();
function bodyLeaveHandler(){
 const body=$('#leaveRows');if(!body||body.dataset.actionsBound)return;
 body.dataset.actionsBound='1';
 body.addEventListener('click',e=>{
  const btn=e.target.closest('[data-leave-action]');if(!btn)return;
  if(role()!=='Admin'&&role()!=='Teacher'){toast('Only teachers and admins can review leave requests');return}
  const index=Number(btn.dataset.leaveIndex),status=btn.dataset.leaveAction;
  if(!Number.isInteger(index)||!leaves[index]||leaves[index].status!=='Pending')return;
  leaves[index].status=status;save();leaveRender();toast('Leave request '+status.toLowerCase());
 });
}
window.updateLeave=(i,s)=>{
 if(role()!=='Admin'&&role()!=='Teacher'){toast('Only teachers and admins can review leave requests');return}
 if(!leaves[i]||leaves[i].status!=='Pending')return;
 leaves[i].status=s;save();leaveRender();toast('Leave request '+s.toLowerCase());
};

function studentReportRender(){
 const out=$('#studentReportResult');if(!out)return;
 const roll=($('#myReportRoll')?.value||'').trim().toUpperCase();
 if(!roll){out.innerHTML='';return}
 const student=students.find(s=>String(s.roll).toUpperCase()===roll);
 if(!student){out.innerHTML='<article class="panel"><p>No student found with that roll number. Please check and try again.</p></article>';return}
 const mine=records.filter(r=>String(r.roll).toUpperCase()===roll).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 if(!mine.length){out.innerHTML='<article class="panel"><h3>'+esc(student.name)+' · '+esc(student.roll)+'</h3><p>No attendance has been recorded for this roll number yet.</p></article>';return}
 const present=mine.filter(r=>r.status==='Present'||r.status==='Late').length;
 const absent=mine.filter(r=>r.status==='Absent').length;
 const pct=Math.round(present/mine.length*100);
 const subjects={};mine.forEach(r=>{const key=r.subject||'General / Register';subjects[key]??={total:0,present:0};subjects[key].total++;if(r.status==='Present'||r.status==='Late')subjects[key].present++});
 out.innerHTML=`<div class="panel" style="margin-bottom:14px"><h3>${esc(student.name)} · ${esc(student.roll)}</h3><p>${esc(student.dept)} · ${esc(student.year)} · Section ${esc(student.section)}</p></div>
 <div class="stats report-stats">
  <article class="stat-card"><div class="stat-label">Total records</div><strong>${mine.length}</strong></article>
  <article class="stat-card"><div class="stat-label">Present / Late</div><strong>${present}</strong></article>
  <article class="stat-card"><div class="stat-label">Absent</div><strong>${absent}</strong></article>
  <article class="stat-card"><div class="stat-label">Attendance percentage</div><strong>${pct}%</strong><small>${pct>=75?'Meeting 75% benchmark':'Below 75% benchmark'}</small></article>
 </div>
 <article class="panel" style="margin-bottom:14px"><div class="panel-head"><div><h3>Subject-wise analytics</h3><p>Present or Late divided by recorded sessions</p></div></div>
  <div class="table-wrap"><table><thead><tr><th>Subject</th><th>Sessions</th><th>Present / Late</th><th>Attendance</th></tr></thead><tbody>${Object.entries(subjects).map(([name,v])=>{const p=Math.round(v.present/v.total*100);return `<tr><td>${esc(name)}</td><td>${v.total}</td><td>${v.present}</td><td><b>${p}%</b><div class="bar-track" style="margin-top:6px"><div class="bar-fill" style="width:${p}%"></div></div></td></tr>`}).join('')}</tbody></table></div>
 </article>
 <article class="panel"><div class="panel-head"><div><h3>Attendance history</h3><p>Your saved attendance records</p></div></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Subject</th><th>Status</th></tr></thead><tbody>${mine.slice().reverse().map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.subject||'General / Register')}</td><td>${badge(r.status)}</td></tr>`).join('')}</tbody></table></div></article>`;
}
$('#studentReportForm').addEventListener('submit',e=>{e.preventDefault();studentReportRender()});

function renderAll(){stat();roster();directory();reports();studentReportRender();noticeRender();leaveRender()}
function openModal(title,html,handler){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=html;$('#modal').classList.add('open');$('#modalBody form').onsubmit=e=>{e.preventDefault();handler(new FormData(e.target));$('#modal').classList.remove('open')}}
$('#closeModal').onclick=()=>$('#modal').classList.remove('open');$('#modal').onclick=e=>{if(e.target.id==='modal')$('#modal').classList.remove('open')};
$('#addStudentBtn').onclick=()=>openModal('Add student',`<form><label>Student full name<input name="name" required></label><label>Roll number<input name="roll" required></label><label>Department<select name="dept">${departments.map(d=>`<option>${d}</option>`)}</select></label><label>Academic year<select name="year">${['1st Year','2nd Year','3rd Year','4th Year'].map(x=>`<option>${x}</option>`)}</select></label><label>Section<select name="section"><option>A</option><option>B</option><option>C</option></select></label><label>Contact number<input name="phone" inputmode="numeric"></label><button class="primary">Save student</button></form>`,f=>{if(students.some(s=>s.roll===f.get('roll'))){toast('Roll number already exists');return}students.push(Object.fromEntries(['name','roll','dept','year','section','phone'].map(k=>[k,f.get(k)])));save();renderAll();toast('Student added')});
$('#addNoticeBtn').onclick=()=>{if(role()!=='Teacher'&&role()!=='Admin'){toast('Only teachers and admins can publish notices');return}openModal('Publish notice',`<form><label>Notice title<input name="title" required></label><label>Message<textarea name="body" required></textarea></label><button class="primary">Publish notice</button></form>`,f=>{notices.push({title:f.get('title'),body:f.get('body'),date:new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})});save();noticeRender();toast('Notice published')})};
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


/* MITS daily attendance code demo — browser-local only, not secure or cross-device. */
(function(){
 const $id=id=>document.getElementById(id);
 const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
 const readSession=()=>{try{return JSON.parse(localStorage.getItem('mits_active_attendance_code')||'null')}catch{return null}};
 const showCode=()=>{
   const s=readSession(), box=$id('teacherCodeResult'); if(!box)return;
   if(!s){box.innerHTML='<p style="color:#777184">No active code yet. Generate one above.</p>';return}
   const expired=Date.now()>s.expires;
   box.innerHTML=expired?'<p style="color:#bd5548;font-weight:700">The previous code has expired. Generate a new one.</p>':
    '<div style="border:1px solid #e9e2eb;border-radius:14px;padding:18px;background:#fbf8fc"><div style="font-size:12px;color:#777184">ANNOUNCE THIS CODE TO YOUR CLASS</div><div style="font-size:38px;font-weight:900;letter-spacing:8px;color:#287f83;margin:8px 0">'+s.code+'</div><div style="font-size:13px">'+s.subject+' · '+s.dept+' · '+s.year+' · Section '+s.section+'</div><div style="font-size:12px;color:#777184;margin-top:8px">Date: '+s.date+' · Valid until '+new Date(s.expires).toLocaleTimeString()+'</div></div>';
 };
 const form=$id('teacherCodeForm');
 if(form)form.addEventListener('submit',e=>{
   e.preventDefault();
   const subject=$id('codeSubject').value.trim();if(!subject)return;
   const code=String(Math.floor(100000+Math.random()*900000));
   const s={code,subject,dept:$id('codeDept').value,year:$id('codeYear').value,section:$id('codeSection').value,date:today(),expires:Date.now()+2*60*60*1000};
   localStorage.setItem('mits_active_attendance_code',JSON.stringify(s));showCode();toast('Attendance code generated');
 });
 const check=$id('studentCodeForm');
 if(check)check.addEventListener('submit',e=>{
   e.preventDefault();
   const roll=$id('checkinRoll').value.trim().toUpperCase(),code=$id('checkinCode').value.trim(),s=readSession(),feedback=$id('checkinFeedback');
   const student=students.find(x=>String(x.roll).toUpperCase()===roll);
   if(!s||Date.now()>s.expires||s.date!==today()){feedback.textContent='No active attendance code. Ask your teacher to generate one.';feedback.style.color='#bd5548';return}
   if(code!==s.code){feedback.textContent='Incorrect attendance code. Please check with your teacher.';feedback.style.color='#bd5548';return}
   if(!student){feedback.textContent='Roll number not found in the demo student list.';feedback.style.color='#bd5548';return}
   if(student.dept!==s.dept||student.year!==s.year||student.section!==s.section){feedback.textContent='This code is for a different class. Please check the class details.';feedback.style.color='#bd5548';return}
   const exists=records.some(x=>x.roll===student.roll&&x.date===s.date&&x.subject===s.subject);
   if(exists){feedback.textContent='Attendance was already submitted for this subject today.';feedback.style.color='#a87525';return}
   records.push({...student,date:s.date,status:'Present',subject:s.subject,source:'Student code check-in'});
   save();renderAll();feedback.textContent='Attendance submitted successfully for '+student.name+'.';feedback.style.color='#287f70';check.reset();toast('Attendance submitted');
 });
 showCode();
})();



/* Local-only demo role workspaces. */
(function(){
 const allowed={
  Student:["dashboard","checkin","studentReport","timetable","notices","leave"],
  Teacher:["dashboard","attendance","teacherCode","students","reports","notices","leave"],
  Admin:["dashboard","attendance","teacherCode","checkin","students","reports","timetable","notices","leave"]
 };
 function apply(){
  const picker=document.getElementById('roleSelect');
  const currentRole=picker?picker.value:'Student';
  const views=allowed[currentRole]||allowed.Student;
  document.querySelectorAll('.nav-item[data-view]').forEach(node=>{
   node.style.setProperty('display',views.includes(node.dataset.view)?'flex':'none','important');
  });
  document.querySelectorAll('.quick-grid [data-goto], [data-goto].text-btn').forEach(node=>{
   node.style.setProperty('display',views.includes(node.dataset.goto)?'':'none','important');
  });
  const noticeButton=document.getElementById("addNoticeBtn");
  if(noticeButton)noticeButton.style.display=(currentRole==="Teacher"||currentRole==="Admin")?"":"none";
  const active=document.querySelector('.view.active');
  if(active&&!views.includes(active.id))navigate('dashboard');
  document.querySelectorAll('.view').forEach(view=>{if(!views.includes(view.id))view.classList.remove('active')});
  const dashboard=document.getElementById('dashboard');
  if(dashboard){
   const stats=dashboard.querySelector('.stats');
   const analytics=dashboard.querySelector('.grid-two');
   const activity=dashboard.querySelector(':scope > .panel');
   [stats,analytics,activity].forEach(el=>{if(el)el.style.display=currentRole==='Student'?'none':'';});
  }
  const checkinHint=document.querySelector('#checkin .panel > div[style*="display:flex"]');
  if(checkinHint)checkinHint.innerHTML='<span class="tag">LOCAL DEMO</span><span style="font-size:12px;color:#777184">Attendance is saved only in this browser.</span>';
 }
 const picker=document.getElementById('roleSelect');
 if(picker)picker.addEventListener('change',apply);
 window.mitsApplyRolePermissions=apply;
 apply();
})();
