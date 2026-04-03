const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ FATAL: Supabase URL or Anon Key is missing from environment variables.');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✅ set' : '❌ MISSING');
  console.error('   SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ set' : '❌ MISSING');
} else {
  console.log(`🔗 Supabase URL: ${supabaseUrl}`);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = supabase;

