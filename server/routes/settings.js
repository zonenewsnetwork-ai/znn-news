const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const auth = require("../middleware/auth");

// Helper to map DB to Frontend format
const mapSettings = (s) => ({
  ...s,
  aiRewriteEnabled: s.ai_rewrite_enabled,
  aiRewriteLength: s.ai_rewrite_length,
  autoFetchEnabled: s.auto_fetch_enabled,
  gnewsEnabled: s.gnews_enabled,
  rssEnabled: s.rss_enabled,
  rssUrls: s.rss_urls,
  seoDefaults: {
    title: s.seo_title,
    description: s.seo_description,
    keywords: s.seo_keywords
  },
  apiKeys: {
    gnews: s.gnews_api_key,
    openai: s.openai_api_key
  }
});

// Get settings (Protected)
router.get("/", auth, async (req, res) => {
  try {
    let { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("key", "global_settings")
      .single();

    if (error || !data) {
      // Create default settings if not exists
      const { data: newData, error: insertError } = await supabase
        .from("settings")
        .insert([{ key: "global_settings" }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      data = newData;
    }

    res.json({ success: true, settings: mapSettings(data) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update settings (Protected)
router.post("/", auth, async (req, res) => {
  try {
    const body = req.body;
    const dbPayload = {};
    
    if (body.aiRewriteEnabled !== undefined) dbPayload.ai_rewrite_enabled = body.aiRewriteEnabled;
    if (body.aiRewriteLength !== undefined) dbPayload.ai_rewrite_length = body.aiRewriteLength;
    if (body.autoFetchEnabled !== undefined) dbPayload.auto_fetch_enabled = body.autoFetchEnabled;
    if (body.gnewsEnabled !== undefined) dbPayload.gnews_enabled = body.gnewsEnabled;
    if (body.rssEnabled !== undefined) dbPayload.rss_enabled = body.rssEnabled;
    if (body.rssUrls !== undefined) dbPayload.rss_urls = body.rssUrls;
    
    if (body.seoDefaults) {
      if (body.seoDefaults.title !== undefined) dbPayload.seo_title = body.seoDefaults.title;
      if (body.seoDefaults.description !== undefined) dbPayload.seo_description = body.seoDefaults.description;
      if (body.seoDefaults.keywords !== undefined) dbPayload.seo_keywords = body.seoDefaults.keywords;
    }
    
    if (body.apiKeys) {
      if (body.apiKeys.gnews !== undefined) dbPayload.gnews_api_key = body.apiKeys.gnews;
      if (body.apiKeys.openai !== undefined) dbPayload.openai_api_key = body.apiKeys.openai;
    }

    const { data, error } = await supabase
      .from("settings")
      .update(dbPayload)
      .eq("key", "global_settings")
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, settings: mapSettings(data) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

