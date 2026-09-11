const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://teqfiiavnyvvokuinjdy.supabase.co';
const supabaseKey = 'sb_publishable_Vlc-abrL0FpL57df63CWfg_dq6M6CUy';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkObjectives() {
  const { data: objectives, error } = await supabase.from('objectives').select('*');
  console.log('=== OBJECTIVES IN TEQFI (REAL 704 DB) ===');
  console.log('Count:', objectives ? objectives.length : 0);
  if (error) console.error('Error:', error);
  if (objectives) {
    objectives.forEach(o => {
      console.log(`ID: ${o.id} | Name: ${o.name} | Client: ${o.client_name || o.client} | Address: ${o.address} | Tenant: ${o.tenant_id}`);
    });
  }
}

checkObjectives().catch(console.error);
