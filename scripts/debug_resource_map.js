const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function debugMap() {
  const { data: entries } = await supabase.from('guard_book_entries').select('*').order('created_at', { ascending: false }).limit(10);
  const { data: resources } = await supabase.from('resources').select('*');

  console.log('Sample entries operator_id:', entries?.map(e => e.operator_id));
  console.log('Sample resources ids:', resources?.slice(0, 10).map(r => r.id));

  const resourceMap = {};
  (resources || []).forEach(r => {
    resourceMap[r.id] = r;
  });

  entries?.forEach(e => {
    const opId = e.operator_id || e.resource_id;
    const match = resourceMap[opId];
    console.log(`Entry operator_id: ${opId} -> Matched Name: ${match ? match.name : 'NULL'}`);
  });
}

debugMap().catch(console.error);
