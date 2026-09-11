const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://teqfiiavnyvvokuinjdy.supabase.co';
const supabaseKey = 'sb_publishable_Vlc-abrL0FpL57df63CWfg_dq6M6CUy';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  const { data, error } = await supabase
    .from('objectives')
    .select('*')
    .order('name');

  console.log('Query result count:', data?.length);
  if (error) console.error('Error:', error);
  else console.log('Sample names:', data?.slice(0, 5).map(o => o.name));
}

testQuery().catch(console.error);
