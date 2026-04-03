const { OpenAI } = require("openai");

let _openaiClient = null;
function getOpenAIClient() {
  if (_openaiClient) return _openaiClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  _openaiClient = new OpenAI({ apiKey });
  return _openaiClient;
}


/**
 * Generates a full SEO-optimized news article.
 * @param {string} topic - The news topic/headline to expand.
 * @returns {Promise<object>} - Article object with content and SEO meta-data.
 */
async function generateSEOArticle(topic) {
  try {
    const prompt = `
      Write a high-quality, SEO-optimized news article on the following topic: "${topic}".

      Requirements:
      - SEO-friendly headline (Title) that targets search intent.
      - Compelling meta description (max 160 characters).
      - 500-800 words of body content with clean HTML formatting.
      - Use <h2> and <h3> subheadings for structure.
      - Maintain a serious, authoritative newsroom tone (like BBC or Hindustan Times).
      - No internal repetition or AI-like fillers.
      - Extract 5-8 relevant SEO keywords.
      - Extract 3-5 tags for categorization.
      - Suggest a 1-word search term for a relevant image.
      - Determine the best category from: Tech, Business, Politics, World, Sports, Science, Entertainment, General.

      Return the response in strictly JSON format:
      {
        "title": "...",
        "description": "...",
        "metaTitle": "...",
        "metaDescription": "...",
        "content": "<p>...</p><h2>...</h2><p>...</p>",
        "keywords": ["...", "..."],
        "tags": ["...", "..."],
        "category": "...",
        "imageSearchTerm": "..."
      }
    `;

    const openai = getOpenAIClient();
    if (!openai) throw new Error("OpenAI API key not configured");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result;
  } catch (err) {
    console.error("OpenAI Generation Error:", err.message);
    throw err;
  }
}

module.exports = { generateFullArticle: generateSEOArticle, generateSEOArticle };
