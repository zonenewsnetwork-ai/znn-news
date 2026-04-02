const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");

router.get("/sitemap.xml", async (req, res) => {
  try {
    const { data: articles, error } = await supabase
      .from("news")
      .select("slug, updated_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    // Fallback to localhost if not set, but ideally this should be the production URL
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <priority>1.0</priority>
  </url>`;

    (articles || []).forEach(a => {
      xml += `
  <url>
    <loc>${baseUrl}/article.html?s=${a.slug}</loc>
    <lastmod>${new Date(a.updated_at).toISOString().split('T')[0]}</lastmod>
    <priority>0.8</priority>
  </url>`;
    });

    xml += `\n</urlset>`;
    res.header("Content-Type", "application/xml");
    res.send(xml);
  } catch (err) {
    res.status(500).end();
  }
});

module.exports = router;

