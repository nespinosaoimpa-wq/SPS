const fs = require('fs');
const path = require('path');
const envPath = path.join(process.cwd(), '.env.local');
let env = '';
try { env = fs.readFileSync(envPath, 'utf8'); } catch(e) {}

const getVal = (key) => {
  const match = env.match(new RegExp(key + '=(.*)'));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : process.env[key];
};

const url = getVal('NEXT_PUBLIC_SUPABASE_URL');
const key = getVal('SUPABASE_SERVICE_ROLE_KEY');

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function dump() {
  const { data } = await supabase.from('resources').select('*');
  console.log('RESOURCES_DUMP_START');
  console.log(JSON.stringify(data, null, 2));
  console.log('RESOURCES_DUMP_END');
}
dump();
