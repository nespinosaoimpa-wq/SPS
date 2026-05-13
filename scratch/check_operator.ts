import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkId() {
  const id = '90f2ce9f-558b-40f1-b6f4-981c23805aa7';
  console.log(`Checking ID: ${id}`);
  
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('id', id)
    .maybeSingle();
    
  if (error) {
    console.error("Error:", error);
  } else if (!data) {
    console.log("Operator NOT FOUND in database.");
    
    // List some operators to see what's there
    const { data: list } = await supabase.from('resources').select('id, name').limit(5);
    console.log("Existing operators (first 5):", list);
  } else {
    console.log("Operator FOUND:", data.name);
  }
}

checkId();
