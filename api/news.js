import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Use environment variables or fallback to those provided in the plan if necessary
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://ewtecgivavqerbskmund.supabase.co";
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_f2zyHqhgjFqKO1Kkqrfq4Q_0c73NfW3";

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { category, id } = req.query;

  try {
    let query = supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false });

    if (id) {
      query = query.eq('id', id).single();
    } else if (category && category !== 'all') {
      query = query.eq('category', category);
    } else {
      // Default: fetch a reasonable amount of latest news
      query = query.limit(50);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase Error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("API Exception:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
