const express = require("express");
const supabase = require("../config/supabase");
const { generateSEOArticle } = require("../services/openai_service");
const { fetchImage } = require("../services/image_service");
const slugify = require("slugify");
const router  = express.Router();

// Helper to map DB to Frontend format
const mapArticle = (a) => ({
  ...a,
  aiGenerated: a.ai_generated,
  publishedAt: a.published_at,
  metaTitle: a.meta_title,
  metaDescription: a.meta_description,
  createdAt: a.created_at,
  updatedAt: a.updated_at
});

/* ---------- POST /api/generate ---------- */
router.post("/", async (req, res) => {
  const prompt = (req.body.prompt || "").trim();
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    console.log(`🤖 [Manual Generate] Expanding topic: "${prompt}"`);

    // 1. Check if title exists to avoid duplicates
    const searchStr = prompt.substring(0, 30);
    const { data: existing, error: searchError } = await supabase
      .from("articles")
      .select("*")
      .ilike("title", `%${searchStr}%`)
      .limit(1)
      .maybeSingle();

    if (existing) return res.json(mapArticle(existing));

    // 2. Generate SEO Content
    const aiResult = await generateSEOArticle(prompt);

    // 3. Fetch Image
    const imageUrl = await fetchImage(aiResult.imageSearchTerm || "news");

    // 4. Save to DB
    const dbPayload = {
      title:           aiResult.title,
      slug:            slugify(aiResult.title, { lower: true, strict: true }),
      description:     aiResult.description,
      content:         aiResult.content,
      category:        aiResult.category || "General",
      tags:            aiResult.tags || [],
      image:           imageUrl,
      meta_title:       aiResult.metaTitle || aiResult.title,
      meta_description: aiResult.metaDescription || aiResult.description,
      keywords:        aiResult.keywords || [],
      ai_generated:    true
    };

    const { data: newArticle, error: insertError } = await supabase
      .from("articles")
      .insert([dbPayload])
      .select()
      .single();

    if (insertError) throw insertError;
    res.json(mapArticle(newArticle));

  } catch (err) {
    console.error("Manual Generation Error:", err.message);
    res.status(500).json({ error: "AI Generation failed. Check API keys." });
  }
});

/* ---------- GET /api/articles (SEO Blog Feed) ---------- */
router.get("/articles", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("articles")
      .select("title, slug, description, image, category, tags, published_at, meta_title, meta_description")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ articles: (data || []).map(mapArticle) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

/* ---------- GET /api/generate/article/:slug (Single Article) ---------- */
router.get("/article/:slug", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("slug", req.params.slug)
      .single();

    if (error || !data) return res.status(404).json({ error: "Article not found" });
    res.json(mapArticle(data));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch article" });
  }
});

/* ---------- GET /api/generate/history ---------- */
router.get("/history", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("ai_generated", true)
      .order("published_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json((data || []).map(mapArticle));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

module.exports = router;

