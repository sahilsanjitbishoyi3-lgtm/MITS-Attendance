/* Public browser config: publishable keys are designed for frontend use. */
(function () {
  const SUPABASE_URL = "https://kawqnjxetpbjajksyolw.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_itMJn3KacRnQUZzAo9vg4w_Ak-Si8sY";
  if (window.supabase && typeof window.supabase.createClient === "function") {
    window.mitsSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  } else {
    console.error("Supabase library did not load.");
  }
})();