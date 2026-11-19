/* Public browser configuration for the MITS Attendance Portal.
   The Supabase publishable key is designed for frontend use.
   Never place a service_role/secret key in this file. */
(function () {
  const SUPABASE_URL = "https://kawqnjxetpbjajksyolw.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_itMJn3KacRnQUZzAo9vg4w_Ak-Si8sY";

  window.MITS_SUPABASE_CONFIG = {
    url: SUPABASE_URL,
    publishableKey: SUPABASE_PUBLISHABLE_KEY
  };

  if (window.supabase && typeof window.supabase.createClient === "function") {
    window.mitsSupabase = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    );
    console.info("MITS Supabase client initialized.");
  } else {
    console.error("Supabase library did not load; check the network connection.");
  }
})();
