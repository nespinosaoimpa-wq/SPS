import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const CANONICAL_704_URL = 'https://xgzkudwuukctaldwcekr.supabase.co';
const CANONICAL_704_ANON_KEY = 'sb_publishable_aFoFA_XdCWTUu-fOLPudmQ_UhT3KO1Q';

export function createServiceClient() {
  let targetUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || CANONICAL_704_URL;
  let targetKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || CANONICAL_704_ANON_KEY;

  // Fail-safe: Override old legacy database URL or old key if set in Vercel environment variables
  if (targetUrl.includes('teqfiiavnyvvokuinjdy') || targetKey.includes('Vlc-abrL0FpL57df63CWfg')) {
    targetUrl = CANONICAL_704_URL;
    targetKey = process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('Vlc-abrL0FpL57df63CWfg')
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : CANONICAL_704_ANON_KEY;
  }

  return createSupabaseClient(targetUrl, targetKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
