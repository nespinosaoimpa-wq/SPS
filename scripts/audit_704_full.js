const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function runAudit() {
  const tenant704 = 'a1b2c3d4-0001-0001-0001-000000000001';
  console.log('=== AUDIT REPORT FOR 704 TENANT ===\n');

  const { data: objectives } = await supabase.from('objectives').select('*').eq('tenant_id', tenant704);
  console.log('--- OBJECTIVES 704 (Count: ' + (objectives ? objectives.length : 0) + ') ---');
  if (objectives) {
    objectives.forEach(o => console.log('  * ID: ' + o.id + ' | Name: ' + o.name + ' | Status: ' + o.status));
  }

  const { data: allObj } = await supabase.from('objectives').select('*');
  console.log('\n--- ALL OBJECTIVES IN DB (Count: ' + (allObj ? allObj.length : 0) + ') ---');
  if (allObj) {
    allObj.forEach(o => console.log('  * ID: ' + o.id + ' | Name: ' + o.name + ' | Tenant: ' + o.tenant_id));
  }

  const { data: resources } = await supabase.from('resources').select('*').eq('tenant_id', tenant704);
  console.log('\n--- RESOURCES / OPERATORS 704 (Count: ' + (resources ? resources.length : 0) + ') ---');
  if (resources) {
    resources.forEach(r => console.log('  * ' + r.first_name + ' ' + r.last_name + ' (' + r.email + ') | Role: ' + r.role + ' | ObjID: ' + r.current_objective_id));
  }

  const { data: authUsers } = await supabase.from('authorized_users').select('*').eq('tenant_id', tenant704);
  console.log('\n--- AUTHORIZED USERS 704 (Count: ' + (authUsers ? authUsers.length : 0) + ') ---');
  if (authUsers) {
    authUsers.forEach(u => console.log('  * ' + (u.name || u.email) + ' (' + u.email + ') | Role: ' + u.role + ' | Active: ' + u.active));
  }

  const { data: shifts } = await supabase.from('guard_shifts').select('*').eq('tenant_id', tenant704);
  console.log('\n--- GUARD SHIFTS 704 (Count: ' + (shifts ? shifts.length : 0) + ') ---');

  const { data: entries } = await supabase.from('guard_book_entries').select('*').eq('tenant_id', tenant704);
  console.log('\n--- NOVEDADES / ENTRIES 704 (Count: ' + (entries ? entries.length : 0) + ') ---');
}

runAudit().catch(console.error);
