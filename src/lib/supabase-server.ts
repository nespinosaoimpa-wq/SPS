import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const CANONICAL_704_URL = 'https://teqfiiavnyvvokuinjdy.supabase.co';
const CANONICAL_704_KEY = 'sb_publishable_Vlc-abrL0FpL57df63CWfg_dq6M6CUy';

export function createServiceClient() {
  let targetUrl = CANONICAL_704_URL;
  let targetKey = CANONICAL_704_KEY;

  // Strict Isolation Guard: Server calls ONLY connect to the official 704 database project
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.includes('teqfiiavnyvvokuinjdy')) {
    targetUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      targetKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || CANONICAL_704_KEY;
    }
  }

  return createSupabaseClient(targetUrl, targetKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
