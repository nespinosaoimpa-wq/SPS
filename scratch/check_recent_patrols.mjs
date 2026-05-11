import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("--- Checking Recent Patrol Rounds ---");
  const { data: rounds, error: rError } = await supabase
    .from('patrol_rounds')
    .select('*, resources(name)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (rError) console.error("Rounds Error:", rError.message);
  else console.log("Recent Rounds:", JSON.stringify(rounds, null, 2));

  if (rounds && rounds.length > 0) {
    const roundId = rounds[0].id;
    console.log(`\n--- Checking Track Points for Round ${roundId} ---`);
    const { data: points, error: pError } = await supabase
      .from('patrol_track_points')
      .select('*')
      .eq('round_id', roundId)
      .limit(5);

    if (pError) console.error("Points Error:", pError.message);
    else console.log(`Recent Points for Round ${roundId}:`, JSON.stringify(points, null, 2));
  }
}

main();
