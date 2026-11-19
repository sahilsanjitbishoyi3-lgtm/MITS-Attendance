/* MITS Supabase browser authentication. Requires supabase-js v2 and supabase-config.js. */
(function () {
  const config = window.MITS_SUPABASE_CONFIG;
  if (!window.supabase || !config || !config.url || !config.anonKey) {
    window.MITSAuth = { ready: false, error: "Supabase configuration is missing." };
    return;
  }
  const client = window.supabase.createClient(config.url, config.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.MITSAuth = {
    ready: true,
    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("id, full_name, role, roll_no, department, academic_year, semester, section, is_active")
        .eq("id", data.user.id)
        .single();
      if (profileError) {
        await client.auth.signOut();
        throw new Error("Your account profile is not provisioned. Contact the MITS administrator.");
      }
      if (!profile.is_active) {
        await client.auth.signOut();
        throw new Error("This MITS account is inactive. Contact the administrator.");
      }
      return { user: data.user, profile };
    },
    async signOut() { return client.auth.signOut(); },
    async getSession() { return client.auth.getSession(); },
    async submitClassroomPin(pin) {
      const { data, error } = await client.rpc("submit_classroom_pin", { p_pin: pin });
      if (error) throw error;
      return data;
    },
    async createClassroomPin(subjectId, periodNo) {
      const { data, error } = await client.rpc("create_classroom_pin", {
        p_subject_id: subjectId, p_period_no: periodNo ?? null
      });
      if (error) throw error;
      return data;
    },
    async setAttendance(sessionId, studentId, status) {
      const { error } = await client.rpc("teacher_set_attendance", {
        p_session_id: sessionId, p_student_id: studentId, p_status: status
      });
      if (error) throw error;
    },
    client
  };
})();
