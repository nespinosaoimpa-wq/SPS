import { createServiceClient } from '@/lib/supabase-server';
import { isConfigured } from '@/lib/supabase';
import { NextResponse } from 'next/server';

function extractMetadata(resource: any) {
  if (!resource) return resource;
  const docs = Array.isArray(resource.documents) ? resource.documents : [];
  const meta = docs.find((d: any) => d && d.type === '704_metadata') || {};

  return {
    ...resource,
    cuil: resource.cuil || meta.cuil || '',
    uniform_delivery_date: resource.uniform_delivery_date || meta.uniform_delivery_date || '',
    uniform_expiry_date: resource.uniform_expiry_date || meta.uniform_expiry_date || '',
    custom_uniforms: Array.isArray(meta.custom_uniforms) ? meta.custom_uniforms : []
  };
}

function packMetadata(body: any, existingDocs: any[] = []) {
  const cleaned: any = {};
  const { cuil, uniform_delivery_date, uniform_expiry_date, custom_uniforms, ...rest } = body;

  for (const [key, value] of Object.entries(rest)) {
    if (['id', 'assigned_objective', 'objectives', 'hourly_pay_rate'].includes(key)) continue;
    cleaned[key] = value === '' ? null : value;
  }

  if ('hourly_pay_rate' in body) {
    cleaned.salary = (body.hourly_pay_rate === '' || body.hourly_pay_rate === null) ? null : Number(body.hourly_pay_rate);
  }

  const docs = Array.isArray(existingDocs) ? [...existingDocs] : [];
  const metaIdx = docs.findIndex((d: any) => d && d.type === '704_metadata');

  const newMeta = {
    type: '704_metadata',
    cuil: cuil || '',
    uniform_delivery_date: uniform_delivery_date || '',
    uniform_expiry_date: uniform_expiry_date || '',
    custom_uniforms: Array.isArray(custom_uniforms) ? custom_uniforms : []
  };

  if (metaIdx >= 0) {
    docs[metaIdx] = { ...docs[metaIdx], ...newMeta };
  } else {
    docs.push(newMeta);
  }

  cleaned.documents = docs;
  return cleaned;
}

export async function GET() {
  try {
    if (!isConfigured) {
      return NextResponse.json([
        { id: 'S-701', name: 'NICO ESPINOSA', role: 'Gerente Operativo', status: 'active', dni: '30.123.456', cuil: '20-30123456-7', email: 'nico@704.com' }
      ]);
    }

    const supabase = createServiceClient();

    const { data: rawData, error: fetchError } = await supabase
      .from('resources')
      .select('*, assigned_objective:objectives(name)')
      .neq('status', 'baja')
      .order('name');

    if (fetchError) throw fetchError;

    const finalData = (rawData || []).map(r => {
      const extracted = extractMetadata(r);
      return {
        ...extracted,
        hourly_pay_rate: r.salary,
        objectives: r.assigned_objective
      };
    });

    return NextResponse.json(finalData, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const cleanedBody = packMetadata(body, []);

    if (cleanedBody.email) {
      const emailLower = cleanedBody.email.toLowerCase().trim();
      const { data: existing, error: checkError } = await supabase
        .from('resources')
        .select('id, status, documents')
        .eq('email', emailLower)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        if (existing.status === 'baja') {
          const updateData = packMetadata(body, existing.documents || []);
          updateData.status = 'active';

          const { data, error } = await supabase
            .from('resources')
            .update(updateData)
            .eq('id', existing.id)
            .select()
            .single();

          if (error) throw error;
          return NextResponse.json(extractMetadata(data));
        } else {
          return NextResponse.json({ error: 'El correo electrónico ya pertenece a un empleado activo en SPS.' }, { status: 400 });
        }
      }
    }

    const { data, error } = await supabase
      .from('resources')
      .insert([cleanedBody])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(extractMetadata(data));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
