const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const isUUID = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

async function testExactFix() {
  const { data: rawList } = await supabase.from('guard_book_entries').select('*').order('created_at', { ascending: false }).limit(20);

  const operatorIds = Array.from(
    new Set(
      rawList
        .map((e) => e.operator_id || e.resource_id)
        .filter((id) => Boolean(id))
    )
  );

  let resourceMap = {};
  if (operatorIds.length > 0) {
    const { data: resources } = await supabase
      .from('resources')
      .select('id, name, avatar_url, role')
      .in('id', operatorIds);

    (resources || []).forEach((r) => {
      resourceMap[r.id] = r;
    });
  }

  console.log('=== EXACT TEST FIX OUTPUT ===\n');

  rawList.forEach((e, idx) => {
    const opId = e.operator_id || e.resource_id;
    const resourceData = opId ? resourceMap[opId] : null;

    let fallbackName = opId || 'Operador 704';
    if (opId && isUUID(opId)) {
      const contentLower = (e.content || '').toLowerCase();
      if (contentLower.includes('inventario')) {
        fallbackName = 'Sistema de Inventario 704';
      } else if (contentLower.includes('alerta') || contentLower.includes('cobertura')) {
        fallbackName = 'Central 704 (Alerta Automatizada)';
      } else {
        fallbackName = 'Control Operativo 704';
      }
    }

    const finalResources = resourceData || { id: opId, name: fallbackName, avatar_url: null, role: 'Guardia' };

    const dateObj = new Date(e.created_at);
    const time24 = dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' hs';

    console.log(`${idx + 1}. [${time24}] Name: "${finalResources.name}" | Avatar: ${finalResources.avatar_url ? 'HAS_PHOTO' : 'NULL'} | Content: ${e.content?.slice(0, 50)}`);
  });
}

testExactFix().catch(console.error);
