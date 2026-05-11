const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
let url = '', key = '';
lines.forEach(l => {
  if (l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = l.split('=')[1].trim();
  if (l.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = l.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function main() {
  const { data, error } = await supabase.from('patrol_rounds').select('*').limit(1);
  if (error) console.error(error);
  else if (data.length > 0) console.log("Columns:", Object.keys(data[0]));
  else console.log("Table is empty");
}

main();
