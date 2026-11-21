/* MITS Supabase authentication. Public signup always creates a STUDENT profile;
   teacher/admin access must be provisioned by an administrator. */
(() => {
  const sb = window.mitsSupabase;
  const welcome = document.getElementById('portalWelcome');
  const modal = document.getElementById('modal');
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');
  const roleSelect = document.getElementById('roleSelect');

  // TEMPORARY DEMO MODE: bypass sign-in so stakeholders can preview each role.
  // This is NOT authentication or authorization. Use only with fictional demo data.
  const MITS_DEMO_ACCESS_WITHOUT_LOGIN = true;
  if (MITS_DEMO_ACCESS_WITHOUT_LOGIN) {
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-enter]');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const chosenRole = button.getAttribute('data-enter');
      if (roleSelect) {
        roleSelect.disabled = false;
        roleSelect.value = chosenRole;
        roleSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (welcome) welcome.style.display = 'none';
      const name = document.getElementById('welcomeRole');
      const avatar = document.getElementById('avatar');
      if (name) name.textContent = chosenRole + ' Demo';
      if (avatar) avatar.textContent = chosenRole === 'Admin' ? 'AD' : chosenRole === 'Teacher' ? 'TR' : 'ST';
      let warning = document.getElementById('mitsDemoModeWarning');
      if (!warning) {
        warning = document.createElement('div');
        warning.id = 'mitsDemoModeWarning';
        warning.style.cssText = 'position:sticky;top:0;z-index:9999;padding:10px 14px;background:#fff1cc;color:#704d00;text-align:center;font-size:12px;font-weight:600';
        warning.textContent = 'DEMO MODE — login is temporarily disabled. Do not enter or use real student data.';
        document.body.prepend(warning);
      }
    }, true);
    return;
  }
  if (!sb) {
    console.error('MITS Supabase client is unavailable.');
    return;
  }
  const roles = { Student: 'student', Teacher: 'teacher', Admin: 'admin' };
  const label = r => r === 'admin' ? 'Admin' : r === 'teacher' ? 'Teacher' : 'Student';
  function message(text) {
    if (typeof window.toast === 'function') window.toast(text);
    else alert(text);
  }
  function openAuth(role, mode) {
    const signup = mode === 'signup';
    title.textContent = signup ? (role === 'Student' ? 'Student account registration' : role + ' access request') : role + ' login';
    if (signup && role !== 'Student') {
      body.innerHTML = '<p>Teacher and Admin accounts cannot be self-created. Please contact the MITS administrator to receive an approved account.</p><button type="button" class="primary" id="authClose">Close</button>';
      body.querySelector('#authClose').onclick = () => modal.classList.remove('open');
    } else {
      body.innerHTML = '<form id="mitsAuthForm" style="display:grid;gap:13px">' +
        (signup ? '<label>Full name<input name="name" required autocomplete="name"></label>' : '') +
        '<label>Email address<input name="email" type="email" required autocomplete="username"></label>' +
        '<label>Password<input name="password" type="password" required minlength="' + (signup ? '8' : '1') + '" autocomplete="' + (signup ? 'new-password' : 'current-password') + '"></label>' +
        '<button class="primary" type="submit">' + (signup ? 'Create student account' : 'Login securely') + '</button>' +
        '<p style="font-size:12px;color:#777184;line-height:1.5;margin:0">' +
        (signup ? 'Student registration only. Your account will be assigned the Student role; your college details must be verified by MITS.' : 'Use the email address registered with MITS. Your access role is checked against the college database.') +
        '</p></form>';
      body.querySelector('#mitsAuthForm').addEventListener('submit', async e => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const email = String(form.get('email')).trim().toLowerCase();
        const password = String(form.get('password'));
        const submit = e.currentTarget.querySelector('button[type=submit]');
        submit.disabled = true; submit.textContent = 'Please wait…';
        try {
          if (signup) {
            const { data, error } = await sb.auth.signUp({
              email, password,
              options: { data: { full_name: String(form.get('name')).trim() } }
            });
            if (error) throw error;
            modal.classList.remove('open');
            message(data.session ? 'Account created. Please wait for MITS profile verification.' : 'Registration received. Check your email to confirm your account. MITS must verify your student profile before portal access.');
          } else {
            const { error } = await sb.auth.signInWithPassword({ email, password });
            if (error) throw error;
            await verifyAndEnter(role);
          }
        } catch (err) {
          message(err.message || 'Authentication failed. Please try again.');
          submit.disabled = false; submit.textContent = signup ? 'Create student account' : 'Login securely';
        }
      });
    }
    modal.style.zIndex = '10020';
    modal.classList.add('open');
  }
  async function verifyAndEnter(requestedRole) {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('Could not verify your signed-in account.');
    const { data: profile, error } = await sb.from('profiles')
      .select('id, full_name, role, is_active')
      .eq('id', user.id).maybeSingle();
    if (error) throw error;
    if (!profile) {
      await sb.auth.signOut();
      throw new Error('Your login is valid, but MITS has not approved/provisioned your portal profile yet. Contact the administrator.');
    }
    if (!profile.is_active) {
      await sb.auth.signOut();
      throw new Error('Your MITS account is inactive. Contact the administrator.');
    }
    if (profile.role !== roles[requestedRole]) {
      await sb.auth.signOut();
      throw new Error('This account is registered as ' + label(profile.role) + ', not ' + requestedRole + '. Choose the correct login.');
    }
    modal.classList.remove('open');
    if (welcome) welcome.style.display = 'none';
    if (roleSelect) { roleSelect.value = requestedRole; roleSelect.disabled = true; }
    const welcomeRole = document.getElementById('welcomeRole');
    const avatar = document.getElementById('avatar');
    if (welcomeRole) welcomeRole.textContent = profile.full_name || requestedRole;
    if (avatar) avatar.textContent = requestedRole === 'Admin' ? 'AD' : requestedRole === 'Teacher' ? 'TR' : 'ST';
    const badge = document.querySelector('.secure');
    if (badge) badge.textContent = '● Signed in · ' + (profile.full_name || user.email);
    const sidebar = document.querySelector('.sidebar-bottom');
    if (sidebar && !document.getElementById('mitsLogout')) {
      const btn = document.createElement('button');
      btn.id = 'mitsLogout'; btn.className = 'reset'; btn.textContent = 'Log out';
      btn.onclick = async () => { await sb.auth.signOut(); location.reload(); };
      sidebar.prepend(btn);
    }
    message('Supabase login successful. Your ' + requestedRole + ' identity is verified.');
    // Existing dashboard data is still a local demo; database-backed screens are a separate next step.
  }
  document.addEventListener('click', e => {
    const button = e.target.closest('[data-enter], [data-signup]');
    if (!button) return;
    e.preventDefault(); e.stopImmediatePropagation();
    openAuth(button.getAttribute('data-enter') || button.getAttribute('data-signup'),
      button.hasAttribute('data-signup') ? 'signup' : 'login');
  }, true);
  sb.auth.getSession().then(async ({ data }) => {
    if (data.session) {
      const { data: profile } = await sb.from('profiles')
        .select('id, full_name, role, is_active').eq('id', data.session.user.id).maybeSingle();
      if (profile?.is_active) {
        const wanted = label(profile.role);
        try { await verifyAndEnter(wanted); } catch (e) { console.warn(e); }
      }
    }
  });
})();