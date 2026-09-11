const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function inspectColumns() {
  const { data: res } = await supabase.from('resources').select('*').limit(2);
  console.log('RESOURCES SAMPLE KEYS:', res && res[0] ? Object.keys(res[0]) : []);
  console.log('RESOURCES SAMPLE DATA:', res);

  const { data: obj } = await supabase.from('objectives').select('*').limit(2);
  console.log('OBJECTIVES SAMPLE KEYS:', obj && obj[0] ? Object.keys(obj[0]) : []);

  const { data: entries } = await supabase.from('guard_book_entries').select('*').limit(2);
  console.log('ENTRIES SAMPLE KEYS:', entries && entries[0] ? Object.keys(entries[0]) : []);
  console.log('ENTRIES SAMPLE DATA:', entries);
}

inspectColumns().catch(console.error);
