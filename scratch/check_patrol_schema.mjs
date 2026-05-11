import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable(tableName) {
  console.log(`\n--- Checking table: ${tableName} ---`);
  const { data, error } = await supabase.from(tableName).select('*').limit(1);
  if (error) {
    console.error(`Error fetching from ${tableName}:`, error.message);
  } else if (data && data.length > 0) {
    console.log(`Columns for ${tableName}:`, Object.keys(data[0]));
  } else {
    console.log(`Table ${tableName} is empty, checking columns via RPC or assume schema...`);
  }
}

async function main() {
  await checkTable('patrol_rounds');
  await checkTable('patrol_track_points');
  await checkTable('gps_tracking');
}

main();
