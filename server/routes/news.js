const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

/**
 * Map frontend category names to database category values.
 * Frontend nav uses: all, world, tech, business, politics, entertainment, sports, science
 * Database stores:   general, world, technology, business, politics, entertainment, sports, science
 */
function mapCategory(cat) {
  if (!cat) return null;
  const map = {
    'home': null,        // show all
    'all': null,         // show all
    'world': 'world',
    'tech': 'technology',
    'technology': 'technology',
    'business': 'business',
    'politics': 'politics',
    'entertainment': 'entertainment',
    'sports': 'sports',
    'science': 'science',
    'general': 'general',
  };
  return map[cat.toLowerCase()] !== undefined ? map[cat.toLowerCase()] : cat.toLowerCase();
}

// GET /api/news — All news or filtered by category
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const mapped = mapCategory(category);
    console.log(`📰 Requested: "${category}" → mapped: "${mapped}"`);

    let query = supabase.from('news').select('*');

    // Filter by category if mapped value exists (null = show all)
    if (mapped) {
      query = query.ilike('category', mapped);
    }

    let { data, error } = await query.order('created_at', { ascending: false }).limit(50);

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error });
    }

    // FALLBACK: If specific category returned 0 results, fetch all news
    if ((!data || data.length === 0) && mapped) {
      console.log(`⚠️ No articles for "${mapped}", falling back to all news`);
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!fallbackError && fallbackData) {
        data = fallbackData;
      }
    }

    console.log(`✅ FETCHED: ${data ? data.length : 0} articles (category: ${mapped || 'all'})`);
    res.json(data || []);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/news/trending — Top trending articles (by views)
router.get('/trending', async (req, res) => {
  try {
    // Try ordering by views first
    let { data, error } = await supabase
      .from('news')
      .select('*')
      .order('views', { ascending: false, nullsFirst: false })
      .limit(10);

    // If views column doesn't exist, fallback to most recent
    if (error) {
      const fallback = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      data = fallback.data || [];
    }

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/news/breaking — Breaking news articles
router.get('/breaking', async (req, res) => {
  try {
    // Try fetching by is_breaking flag
    let { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('is_breaking', true)
      .order('created_at', { ascending: false })
      .limit(10);

    // If is_breaking column doesn't exist, fallback to most recent
    if (error) {
      const fallback = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      data = fallback.data || [];
    }

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/news/id/:id — Single article by UUID
router.get('/id/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Article not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/news/view/:id — Increment view count
router.post('/view/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try RPC first (fastest, single atomic operation)
    const { error: rpcError } = await supabase.rpc('increment_views', { row_id: id });
    
    // If RPC not available, fallback to select+update
    if (rpcError) {
      const { data: current } = await supabase
        .from('news')
        .select('views')
        .eq('id', id)
        .single();
      
      await supabase
        .from('news')
        .update({ views: (current?.views || 0) + 1 })
        .eq('id', id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('View increment error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/news/:slug — Single article by slug (MUST be last — wildcard catch-all)
router.get('/:slug', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('slug', req.params.slug)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Article not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;