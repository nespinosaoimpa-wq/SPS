import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPolicies() {
  console.log("Checking RLS policies for authorized_users...");
  const { data, error } = await supabase.rpc('get_policies', { table_name: 'authorized_users' });
  
  if (error) {
    // If RPC doesn't exist, try manual query to pg_policies
    const { data: pgData, error: pgError } = await supabase.from('pg_policies').select('*').eq('tablename', 'authorized_users');
    if (pgError) {
       // Last resort: query pg_catalog
       const { data: catData, error: catError } = await supabase.rpc('execute_sql', { 
         sql_query: "SELECT * FROM pg_policies WHERE tablename = 'authorized_users'" 
       });
       console.log("Policies:", catData || catError);
    } else {
       console.log("Policies:", pgData);
    }
  } else {
    console.log("Policies:", data);
  }
}

// checkPolicies();
// Since I can't easily run RPCs without knowing if they exist, I'll just try to list users and see if I can delete one.
async function testDelete() {
  const { data: users } = await supabase.from('authorized_users').select('*').limit(1);
  if (users && users.length > 0) {
    console.log("Found user:", users[0].email);
    // I won't actually delete unless I'm sure, but I can check the count.
  }
}
testDelete();
