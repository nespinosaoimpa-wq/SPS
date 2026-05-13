import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_table_columns', { t_name: 'resources' });
  // If RPC doesn't exist, just select one row
  if (error) {
    const { data: oneRow } = await supabase.from('resources').select('*').limit(1);
    if (oneRow && oneRow.length > 0) {
      console.log("Columns in resources:", Object.keys(oneRow[0]));
    } else {
      console.log("No rows in resources to check columns.");
    }
  } else {
    console.log("Columns:", data);
  }
}

checkSchema();
