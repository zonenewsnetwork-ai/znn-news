const { OpenAI } = require('openai');
const supabase = require('../config/supabase');

let client;

function getClient() {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  client = new OpenAI({ apiKey });
  return client;
}

async function getDynamicClient() {
  const { data: settings } = await supabase
    .from("settings")
    .select("openai_api_key")
    .eq("key", "global_settings")
    .single();

  const apiKey = settings?.openai_api_key || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

/**
 * Rewrites a news article using AI for uniqueness and SEO.
 */
async function rewriteArticle(article) {
  const { data: settings } = await supabase
    .from("settings")
    .select("ai_rewrite_enabled, ai_rewrite_length")
    .eq("key", "global_settings")
    .single();

  if (settings && !settings.ai_rewrite_enabled) {
    console.log("ℹ️ AI Rewrite disabled in settings.");
    return null;
  }

  const length = settings?.ai_rewrite_length || "medium";
  const lengthPrompt = {
    short: "150 words",
    medium: "300 words",
    long: "600 words"
  }[length];

  try {
    const prompt = `
      You are an expert news editor and SEO specialist for ZNN (Zone News Network).
      Rewrite the following news article into a 100% unique, human-like, and SEO-optimized news report.

      Original Title: ${article.title}
      Original Description: ${article.description}

      Requirements:
      1. Tone: Professional, journalistic, and engaging (Human-like).
      2. Length: Approximately ${lengthPrompt}.
      3. Language: Simple, easy-to-read English.
      4. Structure (return as JSON):
         - title: An improved, catchy, and SEO-friendly headline.
         - content: The full article body in HTML format. Use <h2> for subheadings, <p> for paragraphs, and <ul>/<li> for a "Key Highlights" section.
         - seoTitle: A perfect SEO title (max 60 chars).
         - metaDescription: A compelling meta description (150-160 chars).

      Output ONLY valid JSON.
    `;

    const openai = await getDynamicClient();
    if (!openai) return null;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result;
  } catch (err) {
    console.error("❌ AI Rewrite Error:", err.message);
    return null;
  }
}

module.exports = { rewriteArticle };

