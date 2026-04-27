
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testJoinStructure() {
  const { data, error } = await supabase
    .from('resources')
    .select('*, objectives(*)')
    .neq('current_objective_id', null)
    .limit(1);

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log("Structure of joined objectives property:");
    const type = Array.isArray(data[0].objectives) ? 'Array' : 'Object';
    console.log(`Type: ${type}`);
    console.log("Value sample:", JSON.stringify(data[0].objectives, null, 2));
  } else {
    console.log("No assigned resources found to test.");
  }
}

testJoinStructure();
