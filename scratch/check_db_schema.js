const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables de entorno Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('--- Verificando columnas de la tabla "resources" ---');
  
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error al consultar resources:', error.message);
  } else if (data && data.length > 0) {
    console.log('Columnas encontradas:', Object.keys(data[0]).join(', '));
  } else {
    console.log('La tabla está vacía o no se puede leer.');
  }
}

checkSchema();
