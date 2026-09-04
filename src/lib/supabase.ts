import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const CANONICAL_704_URL = 'https://teqfiiavnyvvokuinjdy.supabase.co';
const CANONICAL_704_KEY = 'sb_publishable_Vlc-abrL0FpL57df63CWfg_dq6M6CUy';

let rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || CANONICAL_704_URL;
let rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || CANONICAL_704_KEY;

// Fail-safe protection: 704 can NEVER connect to SIGPAD database (xgzkudwuukctaldwcekr)
if (rawUrl.includes('xgzkudwuukctaldwcekr')) {
  rawUrl = CANONICAL_704_URL;
  rawKey = CANONICAL_704_KEY;
}

const supabaseUrl = rawUrl;
const supabaseAnonKey = rawKey;

export const isConfigured = true;

export const createClient = () => {
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
    return createSupabaseClient(supabaseUrl, supabaseAnonKey) as any;
  }
  
  if (!_supabase) {
    _supabase = createClient();
  }
  return _supabase;
})();
