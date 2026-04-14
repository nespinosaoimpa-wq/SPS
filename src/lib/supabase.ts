import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials missing. Check Vercel environment variables.');
}

export const createClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a dummy client that won't crash during build
    return createSupabaseClient('https://placeholder.supabase.co', 'placeholder-key');
  }
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
};

// Lazy initialization to prevent build crashes
let _supabase: ReturnType<typeof createClient> | null = null;

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    if (!_supabase) {
      _supabase = createClient();
    }
    return (_supabase as any)[prop];
  }
});
