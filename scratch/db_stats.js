const fs = require('fs');
const path = require('path');
const envPath = path.join(process.cwd(), '.env.local');
const env = fs.readFileSync(envPath, 'utf8');

const getVal = (key) => {
  const match = env.match(new RegExp(key + '=(.*)'));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : null;
};

const url = getVal('NEXT_PUBLIC_SUPABASE_URL');
const key = getVal('SUPABASE_SERVICE_ROLE_KEY');

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function stats() {
  const tables = [
    'users', 'objectives', 'resources', 'guard_shifts', 'patrol_routes',
    'patrol_checkpoints', 'patrol_logs', 'patrol_alerts', 'incident_reports',
    'tickets', 'feedback_scores', 'cameras', 'evidence_photos', 'gps_tracking',
    'frozen_logs', 'judicial_exports', 'strategic_alerts'
  ];
  
  console.log('--- DATABASE TABLES STATS ---');
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.log(`${table}: Error - ${error.message}`);
      } else {
        console.log(`${table}: ${count} rows`);
      }
    } catch (e) {
      console.log(`${table}: Exception - ${e.message}`);
    }
  }
}

stats();
