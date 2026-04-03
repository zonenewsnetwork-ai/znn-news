const cron = require("node-cron");
const supabase = require("../config/supabase");
const { getTrendingTopics } = require("./topic_service");
const { generateSEOArticle } = require("./openai_service");
const { fetchImage } = require("./image_service");
const slugify = require("slugify");

/**
 * SEO TOPICS — Trending & evergreen topics for organic traffic.
 */
const seoTopics = [
  "Latest AI Technology News India",
  "India Politics Updates Today",
  "Stock Market India Today",
  "Cricket Match Highlights Today",
  "Bollywood Entertainment News",
  "India Space Mission ISRO Update",
  "Electric Vehicles India Market",
  "Startup Funding News India",
  "Climate Change Impact India",
  "Cybersecurity Threats Today",
  "India Education Policy Update",
  "Global Economy Recession Risk",
  "Cryptocurrency Market Today",
  "Supreme Court India Ruling",
  "India Weather Forecast Alert"
];

/**
 * ZNN Auto Blog Scheduler
 * Runs every 30 minutes to generate 1 SEO article.
 */
cron.schedule("*/30 * * * *", async () => {
  console.log("⏰ [Auto Blog] Starting SEO article generation...");

  try {
    // 1. Try trending topics from GNews first
    let topics = [];
    try {
      topics = await getTrendingTopics();
    } catch (e) {
      console.log("⚠️ [Auto Blog] Could not fetch trending topics, using SEO topics.");
    }

    // 2. Merge with SEO topics for variety
    const allTopics = [...topics, ...seoTopics];

    // 3. Pick a fresh topic (not already in DB)
    let selectedTopic = null;
    for (const t of allTopics) {
      const searchStr = t.substring(0, 30);
      const { data: exists, error } = await supabase
        .from("articles")
        .select("id")
        .ilike("title", `%${searchStr}%`)
        .limit(1)
        .maybeSingle();

      if (!exists && !error) {
        selectedTopic = t;
        break;
      }
    }

    // 4. Fallback: random SEO topic with timestamp for uniqueness
    if (!selectedTopic) {
      const base = seoTopics[Math.floor(Math.random() * seoTopics.length)];
      selectedTopic = `${base} - ${new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`;
    }

    console.log(`📡 [Auto Blog] Generating article for: "${selectedTopic}"`);

    // 5. Generate SEO Content via OpenAI
    const aiResult = await generateSEOArticle(selectedTopic);

    // 6. Fetch Image
    const imageUrl = await fetchImage(aiResult.imageSearchTerm || "news");

    // 7. Build and Save Article
    const dbPayload = {
      title:           aiResult.title,
      slug:            slugify(aiResult.title, { lower: true, strict: true }),
      description:     aiResult.description,
      content:         aiResult.content,
      category:        aiResult.category || determineCategory(selectedTopic),
      tags:            aiResult.tags || [],
      image:           imageUrl,
      meta_title:       aiResult.metaTitle || aiResult.title,
      meta_description: aiResult.metaDescription || aiResult.description,
      keywords:        aiResult.keywords || [],
      trending:        true,
      ai_generated:    true
    };

    const { data: newArticle, error: insertError } = await supabase
      .from("articles")
      .insert([dbPayload])
      .select()
      .single();

    if (insertError) throw insertError;
    console.log(`✅ [Auto Blog] Published: "${newArticle.title}"`);
    console.log(`🔗 [Auto Blog] Slug: /article/${newArticle.slug}`);

  } catch (err) {
    console.error("❌ [Auto Blog] Error:", err.message);
  }
});

/**
 * Category detection fallback.
 */
function determineCategory(topic) {
  const t = topic.toLowerCase();
  if (t.includes("tech") || t.includes("ai") || t.includes("apple") || t.includes("google") || t.includes("cyber")) return "Tech";
  if (t.includes("market") || t.includes("stock") || t.includes("economy") || t.includes("startup") || t.includes("funding")) return "Business";
  if (t.includes("politics") || t.includes("election") || t.includes("gov") || t.includes("court") || t.includes("ruling")) return "Politics";
  if (t.includes("world") || t.includes("global") || t.includes("war") || t.includes("climate")) return "World";
  if (t.includes("sport") || t.includes("cricket") || t.includes("football") || t.includes("match")) return "Sports";
  if (t.includes("space") || t.includes("isro") || t.includes("science")) return "Science";
  if (t.includes("bollywood") || t.includes("entertainment") || t.includes("movie")) return "Entertainment";
  return "General";
}

module.exports = {};

