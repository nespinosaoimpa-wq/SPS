import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const CANONICAL_704_URL = 'https://xgzkudwuukctaldwcekr.supabase.co';
const CANONICAL_704_KEY = 'sb_publishable_aFoFA_XdCWTUu-fOLPudmQ_UhT3KO1Q';

export function createServiceClient() {
  const targetUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || CANONICAL_704_URL;
  const targetKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || CANONICAL_704_KEY;

  return createSupabaseClient(targetUrl, targetKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
