const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
console.log('ENV URL:', envConfig.NEXT_PUBLIC_SUPABASE_URL);

const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testEndpoints() {
  console.log('=== VERIFYING REAL 704 DATA FROM .ENV.LOCAL ===\n');

  // 1. Objectives
  const { data: obj } = await supabase.from('objectives').select('*').order('name');
  console.log(`1. Objectives count: ${obj?.length || 0}`);
  console.log('   Sample real company objectives:');
  obj?.slice(0, 8).forEach(o => console.log(`   - ${o.name} (${o.address || 'Sin dirección'})`));

  // 2. Employees / Resources
  const { data: res } = await supabase.from('resources').select('*').order('name');
  console.log(`\n2. Personnel count: ${res?.length || 0}`);
  console.log('   Sample real company personnel:');
  res?.slice(0, 8).forEach(r => console.log(`   - ${r.name} | Role: ${r.role} | Email: ${r.email}`));

  // 3. Authorized Users
  const { data: auth } = await supabase.from('authorized_users').select('*');
  console.log(`\n3. Authorized users count: ${auth?.length || 0}`);
  auth?.slice(0, 8).forEach(u => console.log(`   - ${u.email} (${u.role})`));

  // 4. Guard Book Entries
  const { data: entries } = await supabase.from('guard_book_entries').select('*');
  console.log(`\n4. Guard book entries count: ${entries?.length || 0}`);
}

testEndpoints().catch(console.error);
