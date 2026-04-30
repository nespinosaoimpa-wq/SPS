const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const getVal = (key) => {
  const match = env.match(new RegExp(key + '=(.*)'));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : null;
};
const supabase = createClient(getVal('NEXT_PUBLIC_SUPABASE_URL'), getVal('SUPABASE_SERVICE_ROLE_KEY'));

async function check() {
  const { data } = await supabase.from('resources').select('name, email');
  console.log('RESOURCES:', data);
}
check();
