const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function findSpecific() {
  const { data: entries1 } = await supabase.from('guard_book_entries').select('*');
  const { data: entries2 } = await supabase.from('incidents').select('*');
  const { data: resources } = await supabase.from('resources').select('*');
  const { data: authUsers } = await supabase.from('authorized_users').select('*');

  const allEntries = [...(entries1 || []), ...(entries2 || [])];

  console.log('--- ALL UNMATCHED OPERATORS IN GUARD BOOK & INCIDENTS ---');
  for (const e of allEntries) {
    const opId = e.operator_id || e.resource_id;
    if (!opId) continue;

    // Try finding in resources
    const rMatch = (resources || []).find(r => 
      r.id === opId || r.assigned_to === opId || r.profile_id === opId || r.user_id === opId || r.email?.toLowerCase() === String(opId).toLowerCase()
    );

    // Try finding in authorized_users
    const aMatch = (authUsers || []).find(u => 
      u.id === opId || u.email?.toLowerCase() === String(opId).toLowerCase()
    );

    if (!rMatch && !aMatch) {
      console.log(`Unmatched Entry ID: ${e.id} | Operator ID: ${opId} | Type: ${e.entry_type} | Content: ${e.content?.slice(0, 60)}`);
    }
  }
}

findSpecific().catch(console.error);
