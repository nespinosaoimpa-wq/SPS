const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testMapRoute() {
  const [objectivesRes, resourcesRes] = await Promise.all([
    supabase.from('objectives').select('*'),
    supabase.from('resources').select('*')
  ]);

  console.log('Objectives error:', objectivesRes.error);
  console.log('Resources error:', resourcesRes.error);

  console.log('Objectives fetched count:', objectivesRes.data?.length);
  console.log('Resources fetched count:', resourcesRes.data?.length);

  const rawObjectives = (objectivesRes.data || []).filter((o) => 
    o.is_active !== false && 
    o.status !== 'Inactivo' && 
    o.status !== 'inactivo'
  );

  console.log('Filtered rawObjectives count:', rawObjectives.length);
  if (rawObjectives.length > 0) {
    console.log('Sample objective:', rawObjectives[0].name, 'Lat/Lng:', rawObjectives[0].latitude, rawObjectives[0].longitude);
  }
}

testMapRoute().catch(console.error);
