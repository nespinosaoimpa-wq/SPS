// Diagnóstico de objetivos y recursos en Supabase
// Correr con: node scratch/diagnose_objectives.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ No se encontró .env.local');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) env[key.trim()] = vals.join('=').trim();
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceKey = env['SUPABASE_SERVICE_ROLE_KEY'];
const anonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Faltan variables NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function diagnose() {
  console.log('\n========================================');
  console.log('🔍 DIAGNÓSTICO DE PLATAFORMA SPS');
  console.log('========================================\n');

  // 1. Todos los objetivos (sin filtros)
  console.log('📌 1. TODOS LOS OBJETIVOS (sin filtros):');
  const { data: allObjs, error: e1 } = await supabase.from('objectives').select('id, name, status, is_active, latitude, longitude').order('name');
  if (e1) { console.error('   ❌ Error:', e1.message); }
  else {
    console.log(`   Total encontrados: ${allObjs.length}`);
    allObjs.forEach(o => {
      const coordOk = o.latitude && o.longitude && !isNaN(Number(o.latitude)) && !isNaN(Number(o.longitude));
      console.log(`   - [${o.is_active ? '✅ activo' : '❌ INACTIVO'}] "${o.name}" | status="${o.status}" | coords: ${coordOk ? `${o.latitude}, ${o.longitude}` : '⚠️ INVÁLIDAS'}`);
    });
  }

  // 2. Objetivos filtrados como los ve la API del mapa
  console.log('\n📌 2. OBJETIVOS QUE VE LA API DEL MAPA (is_active=true + status no inactivo):');
  const { data: mapObjs, error: e2 } = await supabase.from('objectives')
    .select('id, name, status, is_active, latitude, longitude')
    .eq('is_active', true)
    .not('status', 'in', '("Inactivo","inactivo","Eliminado","eliminado")')
    .order('name');
  if (e2) { console.error('   ❌ Error en query del mapa:', e2.message); }
  else {
    console.log(`   Objetivos visibles en el mapa: ${mapObjs.length}`);
    if (mapObjs.length === 0) console.log('   ⚠️ El mapa NO recibe ningún objetivo. Revisar datos en DB.');
    mapObjs.forEach(o => {
      const coordOk = o.latitude && o.longitude && !isNaN(Number(o.latitude));
      console.log(`   - "${o.name}" | status="${o.status}" | is_active=${o.is_active} | coords: ${coordOk ? '✅' : '❌ INVÁLIDAS'}`);
    });
  }

  // 3. Recursos (personal)
  console.log('\n📌 3. RECURSOS/PERSONAL EN DB:');
  const { data: allRes, error: e3 } = await supabase.from('resources').select('id, name, status, current_objective_id, latitude, longitude').order('name');
  if (e3) { console.error('   ❌ Error:', e3.message); }
  else {
    console.log(`   Total personal: ${allRes.length}`);
    allRes.forEach(r => {
      console.log(`   - "${r.name}" | status="${r.status}" | objetivo_asignado=${r.current_objective_id || 'ninguno'}`);
    });
  }

  // 4. Columnas de la tabla objectives (para detectar si 'is_active' existe)
  console.log('\n📌 4. VERIFICANDO COLUMNA is_active EN TABLA objectives:');
  const { data: sample, error: e4 } = await supabase.from('objectives').select('*').limit(1);
  if (e4) { console.error('   ❌ Error:', e4.message); }
  else if (sample.length > 0) {
    const cols = Object.keys(sample[0]);
    const hasIsActive = cols.includes('is_active');
    console.log(`   Columnas disponibles: ${cols.join(', ')}`);
    console.log(`   ¿Tiene columna 'is_active'? ${hasIsActive ? '✅ SÍ' : '❌ NO — ESTE ES EL PROBLEMA!'}`);
    if (!hasIsActive) {
      console.log('   ⚠️  La query ".eq(\'is_active\', true)" siempre devuelve 0 resultados!');
    }
  }

  // 5. Test del endpoint /api/employees/[id]
  console.log('\n📌 5. TEST JOIN en tabla resources:');
  const { data: resWithJoin, error: e5 } = await supabase.from('resources')
    .select('id, name, objectives!current_objective_id(name)')
    .limit(1);
  if (e5) {
    console.error(`   ❌ JOIN explícito falla: ${e5.message}`);
    console.log('   → Intentando sin join...');
    const { data: resNoJoin, error: e5b } = await supabase.from('resources').select('id, name').limit(1);
    if (e5b) console.error(`   ❌ Sin join también falla: ${e5b.message}`);
    else console.log(`   ✅ Sin join funciona. Hay ${resNoJoin.length} recursos.`);
  } else {
    console.log(`   ✅ JOIN explícito funciona correctamente.`);
  }

  console.log('\n========================================');
  console.log('✅ Diagnóstico completado');
  console.log('========================================\n');
}

diagnose().catch(console.error);
