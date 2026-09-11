const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const isUUID = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

async function testEnrichment() {
  const { data: rawList } = await supabase.from('guard_book_entries').select('*').order('created_at', { ascending: false }).limit(30);

  const { data: resources } = await supabase.from('resources').select('*');
  const { data: authUsers } = await supabase.from('authorized_users').select('*');

  const resourceMap = {};

  (resources || []).forEach((r) => {
    if (r.id) resourceMap[r.id] = r;
    if (r.user_id) resourceMap[r.user_id] = r;
    if (r.profile_id) resourceMap[r.profile_id] = r;
    if (r.assigned_to) resourceMap[r.assigned_to] = r;
    if (r.email) resourceMap[r.email.toLowerCase().trim()] = r;
  });

  (authUsers || []).forEach((u) => {
    const formattedName = u.name || u.email.split('@')[0];
    const authRes = {
      id: u.id,
      name: formattedName.replace('.', ' ').replace('_', ' ').toUpperCase(),
      role: u.role || 'Operador',
      avatar_url: null
    };
    if (u.id && !resourceMap[u.id]) resourceMap[u.id] = authRes;
    if (u.email && !resourceMap[u.email.toLowerCase().trim()]) resourceMap[u.email.toLowerCase().trim()] = authRes;
  });

  console.log('=== ENRICHED GUARD BOOK ENTRIES SAMPLE ===\n');

  rawList.forEach((e, idx) => {
    const opId = e.operator_id || e.resource_id;
    let resourceData = opId ? resourceMap[opId] : null;

    if (!resourceData || (resourceData.name && isUUID(resourceData.name))) {
      const contentLower = (e.content || '').toLowerCase();
      const typeLower = (e.entry_type || '').toLowerCase();

      let cleanName = 'Operador 704';
      let cleanRole = 'Guardia';

      if (contentLower.includes('inventario') || typeLower === 'inventario') {
        cleanName = 'Sistema de Inventario 704';
        cleanRole = 'Control Automatizado';
      } else if (contentLower.includes('cobertura') || contentLower.includes('alerta') || typeLower === 'alerta' || typeLower === 'emergencia') {
        cleanName = 'Central 704 (Alerta Automatizada)';
        cleanRole = 'Sistema';
      } else if (contentLower.includes('[gerente]') || contentLower.includes('gerencia')) {
        cleanName = 'Control Operativo / Gerencia';
        cleanRole = 'Gerente';
      }

      resourceData = {
        id: opId || 'sistema-704',
        name: cleanName,
        role: cleanRole,
        avatar_url: null
      };
    }

    const dateObj = new Date(e.created_at);
    const formattedTime = dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' hs';
    const formattedDate = dateObj.toLocaleDateString('es-AR');

    console.log(`${idx + 1}. [${formattedTime} - ${formattedDate}] ${resourceData.name} (${resourceData.role}) -> ${e.content?.slice(0, 50)}`);
  });
}

testEnrichment().catch(console.error);
