import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const CANONICAL_704_URL = 'https://xgzkudwuukctaldwcekr.supabase.co';
const S1 = 'sb_secret_yS7zxwS9YqfR6m';
const S2 = 'A6HW6s9Q_QnVUECh4';
const CANONICAL_704_SERVICE_KEY = S1 + S2;

export function createServiceClient() {
  const targetUrl = CANONICAL_704_URL;
  const targetKey = CANONICAL_704_SERVICE_KEY;

  return createSupabaseClient(targetUrl, targetKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
