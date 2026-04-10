import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials missing. Check Vercel environment variables.');
}

export const createClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('CONFIG_ERROR: Supabase URL or Anon Key is missing. Please set Environment Variables in Vercel.');
  }
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
};

export const supabase = createClient();
