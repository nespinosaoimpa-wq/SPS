const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const getVal = (key) => {
  const match = env.match(new RegExp(key + '=(.*)'));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : null;
};

const url = getVal('NEXT_PUBLIC_SUPABASE_URL');
const key = getVal('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('resources').select('*').ilike('name', '%Nico%');
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
check();
