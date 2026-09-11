const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkUUIDs() {
  const { data: entries } = await supabase.from('guard_book_entries').select('*');
  console.log('Total entries:', entries?.length);

  const uuidEntries = (entries || []).filter(e => {
    const op = e.operator_id || e.resource_id;
    return op && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(op);
  });

  console.log('Entries with UUID operator_id:', uuidEntries.length);
  for (const e of uuidEntries.slice(0, 10)) {
    console.log(`ID: ${e.id} | Operator: ${e.operator_id} | Type: ${e.entry_type} | Content: ${e.content?.slice(0, 60)}`);

    // Check resources
    const { data: res } = await supabase.from('resources').select('id, name, email').or(`id.eq.${e.operator_id},assigned_to.eq.${e.operator_id},profile_id.eq.${e.operator_id}`);
    console.log('  -> Resource match:', res);

    // Check authorized_users
    const { data: auth } = await supabase.from('authorized_users').select('id, email, name, role').eq('id', e.operator_id);
    console.log('  -> AuthUser match:', auth);
  }
}

checkUUIDs().catch(console.error);
