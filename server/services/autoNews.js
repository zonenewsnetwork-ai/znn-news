const axios = require("axios");
const cron = require("node-cron");
const supabase = require("../config/supabase");

const API_KEY = process.env.GNEWS_API_KEY;

/* =============== FETCH & SAVE =============== */
async function fetchAndSaveNews() {
  try {
    console.log("⏳ [AutoNews] Fetching trending news...");

    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("*")
      .eq("key", "global_settings")
      .single();

    if (settings && !settings.auto_fetch_enabled) {
      console.log("ℹ️ [AutoNews] Auto-fetch disabled in settings.");
      return;
    }

    const apiKey = settings?.gnews_api_key || process.env.GNEWS_API_KEY;
    if (!apiKey) {
      console.log("❌ [AutoNews] Missing GNEWS_API_KEY, skipping.");
      return;
    }

    const res = await axios.get("https://gnews.io/api/v4/top-headlines", {
      params: {
        country: "in",
        lang: "en",
        max: 10,
        apikey: apiKey
      },
      timeout: 10000
    });

    const rawArticles = res.data.articles || [];
    let saved = 0;

    const trustedSources = ["BBC News", "The Hindu", "Reuters", "CNN", "NDTV", "Times of India", "Al Jazeera"];
    const bannedWords = ["ai generated", "narration", "script", "story explanation", "fiction", "allegorical", "summary of", "explained story"];

    for (let a of rawArticles) {
      const sourceName = a.source?.name || "";
      const text = (a.title + " " + (a.description || "")).toLowerCase();
      const image = a.image || a.urlToImage || a.image_url || "";

      if (!trustedSources.some(ts => sourceName.includes(ts))) continue;
      if (bannedWords.some(word => text.includes(word.toLowerCase()))) continue;
      if (!a.description || a.description.length < 50) continue;
      if (!image || !image.startsWith("http")) continue;

      // Avoid duplicates
      const { data: exists, error: existsError } = await supabase
        .from("news")
        .select("id")
        .eq("title", a.title)
        .limit(1)
        .maybeSingle();

      if (exists) continue;

      // Save
      const dbPayload = {
        title: a.title,
        description: a.description,
        image_url: image,
        url: a.url,
        source: sourceName,
        category: "TRENDING",
        published_at: a.publishedAt || new Date().toISOString()
      };

      const { error: insertError } = await supabase.from("news").insert([dbPayload]);
      if (!insertError) {
        saved++;
        console.log("✅ [AutoNews] Saved:", a.title.substring(0, 60));
      }
    }

    console.log(`📰 [AutoNews] Done — ${saved} new articles saved, ${rawArticles.length - saved} skipped (duplicate/invalid)`);

  } catch (err) {
    console.error("❌ [AutoNews] Fetch Error:", err.message);
  }
}

/* =============== CRON: EVERY 15 MINUTES =============== */
cron.schedule("*/15 * * * *", () => {
  console.log("🔄 [AutoNews] Cron triggered");
  fetchAndSaveNews();
});

/* =============== DB CLEANUP: EVERY HOUR =============== */
setInterval(async () => {
  try {
    const { count, error: countError } = await supabase
      .from("news")
      .select("*", { count: "exact", head: true });

    if (countError) throw countError;

    if (count > 200) {
      const { data: oldest, error: selectError } = await supabase
        .from("news")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(50);

      if (selectError) throw selectError;

      const idsToDelete = oldest.map(d => d.id);
      const { error: deleteError } = await supabase
        .from("news")
        .delete()
        .in("id", idsToDelete);

      if (!deleteError) {
        console.log(`Sweep [AutoNews] Cleaned ${idsToDelete.length} old articles (DB had ${count})`);
      }
    }
  } catch (e) {
    // silently ignore
  }
}, 3600000); // 1 hour

/* =============== INITIAL FETCH ON STARTUP =============== */
console.log("📡 [AutoNews] Service started — fetching every 15 minutes");
fetchAndSaveNews();

module.exports = fetchAndSaveNews;

