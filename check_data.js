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

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function check() {
  try {
    const { data, error } = await supabase
      .from('resources')
      .select('*, objectives(*)')
      .not('current_objective_id', 'is', null)
      .limit(1);
    
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('DATA_START');
      console.log(JSON.stringify(data?.[0] || 'NO_DATA_WITH_OBJECTIVE', null, 2));
      console.log('DATA_END');
    }
  } catch (e) {
    console.error('Catch:', e);
  }
}

check();
