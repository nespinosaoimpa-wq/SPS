import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debugUsers() {
  console.log("--- RESOURCES ---");
  const { data, error } = await supabase.from('resources').select('id, name').limit(5);
  if (error) console.error(error);
  else console.table(data);
}

debugUsers();
