import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isConfigured) {
  console.warn('⚠️ Supabase credentials missing. Running in MOCK/STABLE mode.');
}

export const createClient = () => {
  if (!isConfigured) {
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
