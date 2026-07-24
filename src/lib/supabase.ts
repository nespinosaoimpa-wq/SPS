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
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'sps_704_auth_token',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    }
  });
};

// Singleton instance
let _supabase: any = null;

export const supabase = (() => {
  if (typeof window === 'undefined') {
    // Return a dummy for SSR to prevent crashes if credentials are missing
    return createSupabaseClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder-key') as any;
  }
  
  if (!_supabase) {
    _supabase = createClient();
  }
  return _supabase as any;
})() as any;
