import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://teqfiiavnyvvokuinjdy.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Vlc-abrL0FpL57df63CWfg_dq6M6CUy';
const DEFAULT_SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Vlc-abrL0FpL57df63CWfg_dq6M6CUy';

export function createServiceClient() {
  return createSupabaseClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
