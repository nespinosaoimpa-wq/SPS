import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://xgzkudwuukctaldwcekr.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_aFoFA_XdCWTUu-fOLPudmQ_UhT3KO1Q';

export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SIGUIENTE_URL_SUPABASE_PÚBLICA || DEFAULT_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  return createSupabaseClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
