import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://teqfiavnyvvokuinjdy.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlcWZpYXZueXZ2b2t1aW5qZHkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwNDI0MTQsImV4cCI6MjAxNzYyMDk5M30.fP0A4ejAFRvpk1plZvRqCjWd3cnmR2Ik62YZGyT2Sg8';

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
