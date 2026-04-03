const axios = require("axios");

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

/**
 * Fetches a relevant image from Unsplash based on a search term.
 * @param {string} term - The search term (e.g., "technology", "politics").
 * @returns {Promise<string>} - The URL of the image.
 */
async function fetchImage(term) {
  try {
    if (!UNSPLASH_ACCESS_KEY || UNSPLASH_ACCESS_KEY.includes("your_")) {
      // Fallback if no key
      return `https://images.unsplash.com/photo-1504711434969-e33886168d6c?q=80&w=800`;
    }

    const { data } = await axios.get("https://api.unsplash.com/photos/random", {
      params: {
        query: term,
        orientation: "landscape",
        client_id: UNSPLASH_ACCESS_KEY
      }
    });

    return data.urls.regular;
  } catch (err) {
    console.error("Unsplash Fetch Error:", err.message);
    // Fallback image
    return `https://images.unsplash.com/photo-1495020689067-958852a7765e?q=80&w=800`;
  }
}

module.exports = { fetchImage };
