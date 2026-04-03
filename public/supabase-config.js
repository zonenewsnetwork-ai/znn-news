/* ==========================================================
   Supabase Configuration (Frontend) — Centralized Client
   ========================================================== */

const SUPABASE_URL = "https://ewtecgivavqerbskmund.supabase.co";
const SUPABASE_KEY = "sb_publishable_f2zyHqhgjFqKO1Kkqrfq4Q_0c73NfW3";

// Ensure the Supabase client is initialized ONLY ONCE.
// We store it as `window.supabaseClient` to avoid name collisions with the 
// library object `window.supabase`.
if (!window.supabaseClient) {
  try {
    if (typeof window.supabase === "undefined") {
      console.error("❌ Supabase CDN not loaded. Client initialization failed.");
    } else {
      window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      console.log("Supabase initialized:", window.supabaseClient);
      
      // Quick connectivity check (Internal Debug)
      window.supabaseClient.from('news').select('id', { count: 'exact', head: true })
        .then(({ error }) => {
          if (error) console.error("❌ Supabase connection test failed:", error.message);
          else console.log("✅ Supabase connection test successful.");
        });
    }
  } catch (err) {
    console.error("❌ Failed to initialize Supabase client:", err.message);
  }
}
