const Parser = require('rss-parser');
const supabase = require('../config/supabase');

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'ZNN News Bot/1.0' },
  customFields: {
    item: [
      ['media:content', 'media:content'],
      ['media:thumbnail', 'media:thumbnail'],
      ['content:encoded', 'content:encoded']
    ]
  }
});

// RSS feed sources with category mapping
const feeds = [
  { url: 'https://rss.cnn.com/rss/edition.rss', category: 'World', source: 'CNN' },
  { url: 'https://feeds.bbci.co.uk/news/rss.xml', category: 'World', source: 'BBC' },
  { url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms', category: 'General', source: 'Times of India' },
  { url: 'https://www.thehindu.com/news/national/feeder/default.rss', category: 'Politics', source: 'The Hindu' },
  { url: 'https://techcrunch.com/feed/', category: 'Tech', source: 'TechCrunch' },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', category: 'Business', source: 'BBC Business' },
  { url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', category: 'Entertainment', source: 'BBC Entertainment' },
  { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', category: 'Science', source: 'BBC Science' },
];

// High-quality fallback images per category (Unsplash)
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1504711434969-e33886168d5c?w=800&q=80';

const CATEGORY_IMAGES = {
  world:         'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
  general:       'https://images.unsplash.com/photo-1504711434969-e33886168d5c?w=800&q=80',
  tech:          'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
  technology:    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
  business:      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80',
  politics:      'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80',
  entertainment: 'https://images.unsplash.com/photo-1603190287605-e6ade32fa852?w=800&q=80',
  sports:        'https://images.unsplash.com/photo-1461896836934-bd45ba7b5487?w=800&q=80',
  science:       'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&q=80',
};

/**
 * Detect if article is BREAKING based on title keywords.
 */
function isBreakingNews(title) {
  const t = title.toLowerCase();
  return /breaking|live\s*:|alert|urgent|just\s*in|big\s*news|exclusive|flash/.test(t);
}

/**
 * Automatically assign category based on keywords in title.
 */
function detectCategory(title, fallback) {
  const t = title.toLowerCase();
  if (t.includes("cricket") || t.includes("match") || t.includes("football") || t.includes("ipl") || t.includes("sport") || t.includes("tennis") || t.includes("olympics")) return "sports";
  if (t.includes("ai") || t.includes("tech") || t.includes("iphone") || t.includes("google") || t.includes("chatgpt") || t.includes("software") || t.includes("app") || t.includes("cyber")) return "technology";
  if (t.includes("government") || t.includes("election") || t.includes("modi") || t.includes("congress") || t.includes("minister") || t.includes("parliament") || t.includes("vote")) return "politics";
  if (t.includes("stock") || t.includes("market") || t.includes("business") || t.includes("ipo") || t.includes("economy") || t.includes("finance") || t.includes("bank")) return "business";
  if (t.includes("movie") || t.includes("celebrity") || t.includes("bollywood") || t.includes("film") || t.includes("stars") || t.includes("music") || t.includes("oscar")) return "entertainment";
  if (t.includes("science") || t.includes("space") || t.includes("nasa") || t.includes("study") || t.includes("planet") || t.includes("research") || t.includes("climate")) return "science";
  return (fallback || "general").toLowerCase();
}

/**
 * Extract the best available image URL from an RSS item.
 */
function extractImage(item) {
  // 1. enclosure
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }

  // 2. media:content
  if (item['media:content']?.$?.url) {
    return item['media:content'].$.url;
  }

  // 3. media:thumbnail
  if (item['media:thumbnail']?.$?.url) {
    return item['media:thumbnail'].$.url;
  }

  // 4. content:encoded (VERY IMPORTANT)
  if (item['content:encoded']) {
    const match = item['content:encoded'].match(/<img[^>]+src="([^">]+)"/);
    if (match) return match[1];
  }

  // 5. normal content
  if (item.content) {
    const match = item.content.match(/<img[^>]+src="([^">]+)"/);
    if (match) return match[1];
  }

  // 6. Category-based fallback image
  return null; // Will be replaced with category fallback in fetchRSSNews
}

/**
 * Fetch news from all RSS feeds and insert into Supabase.
 */
async function fetchRSSNews() {
  console.log('📡 [RSS] Starting ingestion cycle...');
  let totalInserted = 0;
  let totalSkipped = 0;

  for (const feed of feeds) {
    try {
      console.log(`   📰 [RSS] Fetching: ${feed.source}...`);
      const parsed = await parser.parseURL(feed.url);
      const items = parsed.items || [];

      let inserted = 0;
      let skipped = 0;

      for (const item of items.slice(0, 15)) {
        const title = (item.title || '').trim();
        const description = (item.contentSnippet || item.content || item.summary || '').trim();

        // Skip invalid
        if (!title || title.length < 10 || !description || description.length < 20) {
          skipped++;
          continue;
        }

        // Clean description
        const cleanDesc = description.replace(/<[^>]*>/g, '').substring(0, 500);

        // Detect Category (always lowercase)
        const category = detectCategory(title, feed.category);

        // Get image — with category-specific fallback
        const extractedImage = extractImage(item);
        const image = (extractedImage && extractedImage.startsWith('http'))
          ? extractedImage
          : (CATEGORY_IMAGES[category] || FALLBACK_IMAGE);
        const pubDate = new Date(item.pubDate || item.pubdate || item.isoDate || Date.now());
        const recentEnough = (Date.now() - pubDate.getTime()) < 3600000; // less than 1 hour old
        const breaking = isBreakingNews(title) || recentEnough;

        // Check duplicate
        const { data: existing } = await supabase
          .from('news')
          .select('id')
          .eq('title', title)
          .limit(1)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        // Insert
        const { error } = await supabase
          .from('news')
          .insert([{
            title,
            description: cleanDesc,
            image_url: image,
            category: category
          }]);

        if (error) {
          console.error(`   ❌ [RSS] Insert error (${feed.source}): ${error.message}`);
        } else {
          inserted++;
        }
      }

      totalInserted += inserted;
      totalSkipped += skipped;
      if (inserted > 0) console.log(`   ✅ [RSS] ${feed.source}: ${inserted} new, ${skipped} skipped`);

    } catch (err) {
      console.error(`   ⚠️ [RSS] ${feed.source} failed: ${err.message}`);
    }
  }

  console.log(`📊 [RSS] Cycle complete — ${totalInserted} inserted, ${totalSkipped} skipped`);

  // Prune old articles
  await pruneOldNews(500);
}

/**
 * Keep only the latest N articles in the database.
 */
async function pruneOldNews(limit = 500) {
  try {
    const { data, error } = await supabase
      .from('news')
      .select('created_at')
      .order('created_at', { ascending: false })
      .range(limit, limit);

    if (error || !data || data.length === 0) return;

    const cutoffDate = data[0].created_at;
    const { error: delError } = await supabase
      .from('news')
      .delete()
      .lt('created_at', cutoffDate);

    if (delError) {
      console.error('❌ [Pruning] Error:', delError.message);
    } else {
      console.log(`🧹 [Pruning] Cleaned old articles (keeping latest ${limit})`);
    }
  } catch (err) {
    console.error('❌ [Pruning] Error:', err.message);
  }
}

module.exports = { fetchRSSNews };
