const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkResources() {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .ilike('name', '%Nicolas%');
  
  if (error) {
    console.error(error);
    return;
  }
  
  console.log("Found resources:", JSON.stringify(data, null, 2));
}

checkResources();
