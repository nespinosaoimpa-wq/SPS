import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function listTables() {
  const { data, error } = await supabase.from('pg_tables').select('tablename').eq('schemaname', 'public');
  // Wait, anon key can't read pg_tables usually.
  // I'll try to query a few likely names.
  const tables = ['authorized_users', 'users', 'resources', 'objectives', 'guard_shifts'];
  for (const t of tables) {
    const { error } = await supabase.from(t).select('id').limit(1);
    console.log(`Table ${t}: ${error ? error.message : 'OK'}`);
  }
}

listTables();
