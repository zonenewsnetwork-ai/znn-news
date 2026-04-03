const axios = require("axios");

const NEWS_API_KEY = process.env.NEWS_API_KEY;

/**
 * Fetches current trending headlines from NewsAPI as topics.
 * @returns {Promise<string[]>} - Array of trending topics/titles.
 */
async function getTrendingTopics() {
  try {
      const { data } = await axios.get("https://gnews.io/api/v4/top-headlines", {
      params: {
        country: "in",
        lang: "en",
        max: 10,
        apikey: process.env.GNEWS_API_KEY || "YOUR_GNEWS_API_KEY"
      }
    });

    return (data.articles || [])
      .filter(a => a.title && a.title !== "[Removed]")
      .map(a => a.title);
  } catch (err) {
    console.error("Topic Engine Error:", err.message);
    return [];
  }
}

module.exports = { getTrendingTopics };
