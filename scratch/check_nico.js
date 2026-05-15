const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const envPath = path.join(process.cwd(), '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const getVal = (key) => {
  const match = env.match(new RegExp(key + '=(.*)'));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : null;
};
const url = getVal('NEXT_PUBLIC_SUPABASE_URL');
const key = getVal('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('resources').select('*').ilike('name', '%Nico%');
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
check();
