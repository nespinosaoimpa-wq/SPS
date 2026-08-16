import { createServiceClient } from '@/lib/supabase-server';
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
    cuil: cuil !== undefined ? cuil : (docs[metaIdx]?.cuil || ''),
    uniform_delivery_date: uniform_delivery_date !== undefined ? uniform_delivery_date : (docs[metaIdx]?.uniform_delivery_date || ''),
    uniform_expiry_date: uniform_expiry_date !== undefined ? uniform_expiry_date : (docs[metaIdx]?.uniform_expiry_date || ''),
    custom_uniforms: custom_uniforms !== undefined ? custom_uniforms : (docs[metaIdx]?.custom_uniforms || [])
  };

  if (metaIdx >= 0) {
    docs[metaIdx] = { ...docs[metaIdx], ...newMeta };
  } else {
    docs.push(newMeta);
  }

  cleaned.documents = docs;
  return cleaned;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServiceClient();
    const { id } = await params;

    let { data, error } = await supabase
      .from('resources')
      .select('*, objectives!current_objective_id(name)')
      .eq('id', id)
      .single();

    if (error) {
      const fallback = await supabase
        .from('resources')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fallback.error) {
        return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 });
      }
      data = fallback.data;
    }

    return NextResponse.json(extractMetadata(data));
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();

    const { data: existingResource } = await supabase
      .from('resources')
      .select('documents, current_objective_id')
      .eq('id', id)
      .single();

    const cleanedBody = packMetadata(body, existingResource?.documents || []);

    if (body.current_objective_id) {
      if (existingResource?.current_objective_id && 
          existingResource.current_objective_id !== body.current_objective_id) {
        return NextResponse.json({ 
          error: 'Este operador ya está vinculado a otro objetivo. Desvincular primero.' 
        }, { status: 409 });
      }
    }

    const { data, error } = await supabase
      .from('resources')
      .update(cleanedBody)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (cleanedBody.current_objective_id === null) {
      await supabase
        .from('objectives')
        .update({ current_operator_id: null, manned_status: 'Descubierto' })
        .eq('current_operator_id', id);
    }

    return NextResponse.json(extractMetadata(data));
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
