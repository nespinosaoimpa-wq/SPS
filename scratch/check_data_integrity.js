
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = '.env.local';
if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, 'utf8');
  content.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.substring(1, value.length - 1);
      process.env[key] = value;
    }
  });
}

console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "FOUND" : "MISSING");
console.log("ANON:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "FOUND" : "MISSING");
console.log("SERVICE:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "FOUND" : "MISSING");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("--- OBJECTIVES ---");
  const { data: objectives, error: objError } = await supabase.from('objectives').select('*');
  if (objError) console.error(objError);
  else console.log(JSON.stringify(objectives, null, 2));

  console.log("\n--- RESOURCES ---");
  const { data: resources, error: resError } = await supabase.from('resources').select('id, name, status, latitude, longitude');
  if (resError) console.error(resError);
  else console.log(JSON.stringify(resources, null, 2));
}

check();
