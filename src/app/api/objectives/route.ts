import { isConfigured } from '@/lib/supabase';
import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    if (!isConfigured) {
      // Mock data for local testing without Supabase keys
      return NextResponse.json([
        { id: 'OBJ-001', name: 'Puerto 704', address: 'Dique 1, Puerto 704', latitude: -31.6450, longitude: -60.6950, status: 'Activo', is_active: true },
        { id: 'OBJ-002', name: 'Consorcio Portofino', address: 'Costanera Este', latitude: -31.6280, longitude: -60.6750, status: 'Activo', is_active: true },
        { id: 'OBJ-003', name: 'Planta Industrial', address: 'Sauce Viejo', latitude: -31.7200, longitude: -60.7800, status: 'Alerta', is_active: true },
      ]);
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('objectives')
      .select('*')
      .order('name');

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const payload = {
      ...body,
      latitude: parseFloat(body.latitude),
      longitude: parseFloat(body.longitude),
      status: body.status || 'Activo',
      is_active: true,
      tenant_id: body.tenant_id || 'a1b2c3d4-0001-0001-0001-000000000001'
    };

    const { data, error } = await supabase
      .from('objectives')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
