const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const jwt = require("jsonwebtoken");

// Helper to map DB snake_case to Frontend camelCase if needed
const mapNews = (n) => ({
  ...n,
  imageUrl: n.image_url,
  trendingScore: n.trending_score,
  originalTitle: n.original_title,
  fullContent: n.full_content,
  seoTitle: n.seo_title,
  meta_description: n.meta_description,
  isBreaking: n.is_breaking,
  publishedAt: n.published_at,
  createdAt: n.created_at,
  updatedAt: n.updated_at,
  image: n.image_url // Compatibility
});

router.get("/dashboard", async (req, res) => {
  try {
    const [
      { count: totalNews, error: newsError },
      { count: totalLive, error: liveError },
      { count: totalAds, error: adsError },
      { data: recentNewsRaw, error: recentNewsError },
      { data: liveChannels, error: channelsError }
    ] = await Promise.all([
      supabase.from("news").select("*", { count: "exact", head: true }),
      supabase.from("live_tv").select("*", { count: "exact", head: true }),
      supabase.from("ads").select("*", { count: "exact", head: true }),
      supabase.from("news").select("*").order("created_at", { ascending: false }).limit(10),
      supabase.from("live_tv").select("*").order("created_at", { ascending: false })
    ]);

    if (newsError) throw newsError;
    if (liveError) throw liveError;
    if (adsError) throw adsError;
    if (recentNewsError) throw recentNewsError;
    if (channelsError) throw channelsError;

    res.json({ 
      success: true, 
      totalNews: totalNews || 0, 
      totalLive: totalLive || 0,
      totalAds: totalAds || 0,
      recentNews: (recentNewsRaw || []).map(mapNews), 
      liveChannels: liveChannels || []
    });
  } catch (err) {
    console.error("🔥 Dashboard Detailed Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to load dashboard data: " + err.message 
    });
  }
});

router.post("/fetch-now", async (req, res) => {
  try {
    const { fetchAndSaveNews } = require("../services/gnewsService");
    fetchAndSaveNews(); // Run in background
    res.json({ success: true, message: "Manual fetch triggered!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

