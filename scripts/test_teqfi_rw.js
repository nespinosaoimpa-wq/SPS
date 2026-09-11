const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://teqfiiavnyvvokuinjdy.supabase.co';
const supabaseKey = 'sb_publishable_Vlc-abrL0FpL57df63CWfg_dq6M6CUy';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRW() {
  console.log('--- TESTING TEQFI READ/WRITE ---');
  
  // 1. Read objectives
  const { data: obj, error: objErr } = await supabase.from('objectives').select('id, name').limit(5);
  console.log('Objectives count:', obj?.length, 'Sample:', obj);
  if (objErr) console.error('Obj Err:', objErr);

  // 2. Read resources
  const { data: res, error: resErr } = await supabase.from('resources').select('id, name, email').limit(5);
  console.log('Resources count:', res?.length, 'Sample:', res);
  if (resErr) console.error('Res Err:', resErr);

  // 3. Read authorized_users
  const { data: auth, error: authErr } = await supabase.from('authorized_users').select('id, email, role').limit(5);
  console.log('Auth users count:', auth?.length, 'Sample:', auth);
  if (authErr) console.error('Auth Err:', authErr);

  // 4. Read guard_book_entries
  const { data: entries, error: entErr } = await supabase.from('guard_book_entries').select('id, content').limit(5);
  console.log('Entries count:', entries?.length, 'Sample:', entries);
  if (entErr) console.error('Ent Err:', entErr);
}

testRW().catch(console.error);
