const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read from .env.local manually
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];

const supabase = createClient(url, key);

async function main() {
  const { data, error } = await supabase.from('patrol_rounds').select('*').limit(5);
  if (error) console.error(error);
  else console.log("Recent Rounds (Raw):", JSON.stringify(data, null, 2));
}

main();
