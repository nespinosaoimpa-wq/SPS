const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://teqfiiavnyvvokuinjdy.supabase.co';
const supabaseKey = 'sb_publishable_Vlc-abrL0FpL57df63CWfg_dq6M6CUy';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('=== REAL 704 SUPABASE PROJECT DATA (teqfiiavnyvvokuinjdy) ===\n');

  const { data: objectives, error: objErr } = await supabase.from('objectives').select('*');
  console.log('OBJECTIVES IN REAL 704 DB (count:', objectives?.length, '):');
  if (objErr) console.error('Error objectives:', objErr);
  objectives?.forEach((o, i) => console.log(` ${i+1}. ID: ${o.id} | Name: ${o.name} | Address: ${o.address}`));

  const { data: resources, error: resErr } = await supabase.from('resources').select('*');
  console.log('\nRESOURCES / EMPLOYEES IN REAL 704 DB (count:', resources?.length, '):');
  if (resErr) console.error('Error resources:', resErr);
  resources?.forEach((r, i) => console.log(` ${i+1}. ID: ${r.id} | Name: ${r.name} | Role: ${r.role} | Email: ${r.email}`));

  const { data: authUsers, error: authErr } = await supabase.from('authorized_users').select('*');
  console.log('\nAUTHORIZED USERS IN REAL 704 DB (count:', authUsers?.length, '):');
  if (authErr) console.error('Error authUsers:', authErr);
  authUsers?.forEach((u, i) => console.log(` ${i+1}. Email: ${u.email} | Role: ${u.role}`));

  const { data: entries, error: entErr } = await supabase.from('guard_book_entries').select('*');
  console.log('\nNOVEDADES IN REAL 704 DB (count:', entries?.length, '):');
  if (entErr) console.error('Error entries:', entErr);

  const { data: users, error: usersErr } = await supabase.from('users').select('*');
  console.log('\nUSERS IN REAL 704 DB (count:', users?.length, '):');
  if (usersErr) console.error('Error users:', usersErr);
  users?.forEach((u, i) => console.log(` ${i+1}. Email: ${u.email} | Role: ${u.role}`));
}

run().catch(console.error);
