const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function inspectObjectives() {
  const tenant704 = 'a1b2c3d4-0001-0001-0001-000000000001';
  const { data: obj } = await supabase.from('objectives').select('*').eq('tenant_id', tenant704);
  console.log('=== ALL 10 OBJECTIVES IN 704 ===');
  obj.forEach((o, idx) => {
    console.log(`${idx + 1}. ID: ${o.id} | Name: ${o.name} | Address: ${o.address} | Client: ${o.client_name}`);
  });
}

inspectObjectives().catch(console.error);
