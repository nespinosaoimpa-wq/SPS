import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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
    
    // Intento ciego de inserción para ver error de Postgres
    const { error: insertError } = await supabase
      .from('resources')
      .insert([{ name: 'TEST_PROBE_704', role: 'test' }]);
    
    if (insertError) {
      console.error('Error de inserción (detalle):', insertError);
    } else {
      console.log('Inserción exitosa sin hourly_pay_rate. Columnas probables: id, name, role, status...');
    }
  }
}

checkSchema();
