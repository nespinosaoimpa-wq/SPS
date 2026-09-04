import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const CANONICAL_704_URL = 'https://teqfiiavnyvvokuinjdy.supabase.co';
const CANONICAL_704_KEY = 'sb_publishable_Vlc-abrL0FpL57df63CWfg_dq6M6CUy';

export function createServiceClient() {
  let targetUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || CANONICAL_704_URL;
  let targetKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || CANONICAL_704_KEY;

  // Fail-safe protection: Lock 704 to its canonical database (teqfiiavnyvvokuinjdy)
  if (targetUrl.includes('xgzkudwuukctaldwcekr')) {
    targetUrl = CANONICAL_704_URL;
    targetKey = CANONICAL_704_KEY;
  }

  return createSupabaseClient(targetUrl, targetKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
