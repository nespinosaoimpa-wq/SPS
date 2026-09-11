const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function testFK() {
  const { data, error } = await supabase
    .from('resources')
    .select('*, objectives:current_objective_id(name)')
    .eq('tenant_id', 'a1b2c3d4-0001-0001-0001-000000000001');

  if (error) console.error('FK Error:', error);
  else console.log('FK Query Success! Sample resource with objective:', data?.find(r => r.objectives));
}

testFK().catch(console.error);
