const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function checkIsActive() {
  const tenant704 = 'a1b2c3d4-0001-0001-0001-000000000001';
  const { data: obj } = await supabase.from('objectives').select('*').eq('tenant_id', tenant704);
  console.log('=== OBJECTIVES IS_ACTIVE CHECK ===');
  obj.forEach(o => console.log(`ID: ${o.id} | Name: ${o.name} | is_active: ${o.is_active}`));
}

checkIsActive().catch(console.error);
