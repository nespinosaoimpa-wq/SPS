import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const CANONICAL_704_URL = 'https://teqfiiavnyvvokuinjdy.supabase.co';
const CANONICAL_704_KEY = 'sb_publishable_Vlc-abrL0FpL57df63CWfg_dq6M6CUy';

let supabaseUrl = CANONICAL_704_URL;
let supabaseAnonKey = CANONICAL_704_KEY;

// Strict Isolation Guard: 704 application ONLY connects to the official 704 database project
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.includes('teqfiiavnyvvokuinjdy')) {
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }
}

export const isConfigured = true;

export function generateW3CTraceParent(): string {
  const hex = (len: number) => {
    let result = '';
    while (result.length < len) {
      result += Math.floor(Math.random() * 16).toString(16);
    }
    return result.slice(0, len);
  };
  return `00-${hex(32)}-${hex(16)}-01`;
}

export const createClient = () => {
  const traceHeader = generateW3CTraceParent();
  const traceId = traceHeader.split('-')[1];

  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'sps_704_auth_token',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    global: {
      headers: {
        'traceparent': traceHeader,
        'x-sigpad-trace-id': traceId,
      }
    }
  });
};

// Singleton instance
let _supabase: any = null;

export const supabase = (() => {
  if (typeof window === 'undefined') {
    const traceHeader = generateW3CTraceParent();
    const traceId = traceHeader.split('-')[1];
    return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          'traceparent': traceHeader,
          'x-sigpad-trace-id': traceId,
        }
      }
    }) as any;
  }
  
  if (!_supabase) {
    _supabase = createClient();
  }
  return _supabase;
})();
