import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://ewtecgivavqerbskmund.supabase.co";
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_f2zyHqhgjFqKO1Kkqrfq4Q_0c73NfW3";

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    const { data, error } = await supabase
      .from('ads')
      .select('*')
      .eq('status', true);

    if (error) {
      console.error("Supabase Error (Ads):", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("API Exception (Ads):", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
