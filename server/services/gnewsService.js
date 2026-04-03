const axios = require('axios');
const supabase = require('../config/supabase');

const API_KEY = process.env.GNEWS_API_KEY;

// Category map for GNews topics
const TOPICS = [
  { topic: 'general', category: 'general' },
  { topic: 'technology', category: 'technology' },
  { topic: 'business', category: 'business' },
  { topic: 'science', category: 'science' },
  { topic: 'sports', category: 'sports' },
  { topic: 'entertainment', category: 'entertainment' }
];

let topicIndex = 0;

/**
 * Detect if article is BREAKING based on title keywords.
 */
function isBreakingNews(title) {
  const t = title.toLowerCase();
  return /breaking|live\s*:|alert|urgent|just\s*in|big\s*news|exclusive|flash/.test(t);
}

/**
 * Fetch top headlines from GNews and store in Supabase.
 * Rotates through topics on each call to stay within API limits.
 */
async function fetchAndSaveNews() {
  if (!API_KEY) {
    console.log('⚠️ [GNews] No GNEWS_API_KEY set, skipping fetch.');
    return;
  }

  const { topic, category } = TOPICS[topicIndex];
  topicIndex = (topicIndex + 1) % TOPICS.length;

  console.log(`📡 [GNews] Fetching topic: ${topic}...`);

  try {
    const url = `https://gnews.io/api/v4/top-headlines?topic=${topic}&lang=en&country=in&max=10&apikey=${API_KEY}`;
    const response = await axios.get(url, { timeout: 10000 });

    const articles = response.data?.articles || [];
    console.log(`📥 [GNews] Received ${articles.length} articles from API`);

    if (articles.length === 0) return;

    let inserted = 0;
    let skipped = 0;

    for (const art of articles) {
      // Skip articles without proper data
      if (!art.title || !art.description || art.description.length < 30) {
        skipped++;
        continue;
      }

      // Get image URL from multiple possible fields
      const imageUrl = art.image || art.urlToImage || '';
      if (!imageUrl || !imageUrl.startsWith('http')) {
        skipped++;
        continue;
      }

      // Check for duplicate (same title)
      const { data: existing } = await supabase
        .from('news')
        .select('id')
        .eq('title', art.title)
        .limit(1)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      // Insert into Supabase
      const { error: insertError } = await supabase
        .from('news')
        .insert([{
          title: art.title,
          description: art.description,
          image_url: imageUrl,
          category: category.toLowerCase()
        }]);

      if (insertError) {
        console.error(`❌ [GNews] Insert error: ${insertError.message}`);
      } else {
        inserted++;
      }
    }

    console.log(`✅ [GNews] Done — ${inserted} inserted, ${skipped} skipped (duplicate/invalid)`);

  } catch (err) {
    if (err.response?.status === 403) {
      console.error('⚠️ [GNews] API limit reached (403). Will retry next cycle.');
    } else {
      console.error('❌ [GNews] Fetch error:', err.message);
    }
  }
}

module.exports = { fetchAndSaveNews };
