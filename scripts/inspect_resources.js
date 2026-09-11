const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function inspectResources() {
  const tenant704 = 'a1b2c3d4-0001-0001-0001-000000000001';
  const { data: res } = await supabase.from('resources').select('*').eq('tenant_id', tenant704);
  console.log('=== ALL 13 RESOURCES IN 704 ===');
  res.forEach((r, idx) => {
    console.log(`${idx + 1}. Name: ${r.name} | Role: ${r.role} | Email: ${r.email} | DNI: ${r.dni} | Phone: ${r.phone} | ObjID: ${r.current_objective_id}`);
  });
}

inspectResources().catch(console.error);
