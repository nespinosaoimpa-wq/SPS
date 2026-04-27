
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testJoin() {
  console.log("Testing plural join...");
  const plural = await supabase.from('resources').select('*, objectives(name)').limit(1);
  console.log("Plural error:", plural.error?.message);
  
  console.log("Testing singular join...");
  const singular = await supabase.from('resources').select('*, objective(name)').limit(1);
  console.log("Singular error:", singular.error?.message);

  if (plural.data) console.log("Plural data sample:", JSON.stringify(plural.data[0], null, 2));
  if (singular.data) console.log("Singular data sample:", JSON.stringify(singular.data[0], null, 2));
}

testJoin();
