const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function assignObjectives() {
  const tenant704 = 'a1b2c3d4-0001-0001-0001-000000000001';
  
  const assignments = [
    { email: 'mendoza.jose@704.com.ar', objectiveId: 'obj-norte-001' },
    { email: 'horaciocaliba34@gmail.com', objectiveId: 'obj-norte-001' },
    { email: 'valecac6@gmail.com', objectiveId: 'obj-norte-002' },
    { email: 'juanmanueldipasqualeaguilar@gmail.com', objectiveId: 'obj-norte-003' },
    { email: 'smartflow.1995@gmail.com', objectiveId: 'OBJ-52013' },
    { email: 'nanoythiago1923@gmail.com', objectiveId: 'OBJ-12161' },
    { email: 'santisegal04@gmail.com', objectiveId: 'OBJ-78463' },
    { email: 'segalvittorio@gmail.com', objectiveId: 'OBJ-78463' }
  ];

  for (const item of assignments) {
    const { data, error } = await supabase
      .from('resources')
      .update({ current_objective_id: item.objectiveId })
      .eq('tenant_id', tenant704)
      .eq('email', item.email);

    if (error) {
      console.error(`Error assigning ${item.email}:`, error);
    } else {
      console.log(`Successfully assigned ${item.email} to objective ${item.objectiveId}`);
    }
  }
}

assignObjectives().catch(console.error);
