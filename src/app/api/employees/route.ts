import { createServiceClient } from '@/lib/supabase-server';
import { isConfigured } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    if (!isConfigured) {
      // Mock data for local testing without Supabase keys
      return NextResponse.json([
        { id: 'S-701', name: 'NICO ESPINOSA', role: 'Gerente Operativo', status: 'active', dni: '30.123.456', email: 'nico@704.com' },
        { id: 'S-802', name: 'CARLOS GIMENEZ', role: 'Vigilador Senior', status: 'active' },
        { id: 'S-905', name: 'ANA MARTINEZ', role: 'Vigilador', status: 'active' },
        { id: 'S-102', name: 'PEDRO GOMEZ', role: 'Vigilador', status: 'inactive' },
      ]);
    }

    const supabase = createServiceClient();

    const { data: rawData, error: fetchError } = await supabase
      .from('resources')
      .select('id, name, role, status, avatar_url, current_objective_id')
      .neq('status', 'baja')
      .order('name');

    if (fetchError) throw fetchError;

    let finalData = rawData;

    // Manual join for objectives
    if (rawData && rawData.length > 0) {
      const objIds = [...new Set(rawData.map(r => r.current_objective_id).filter(Boolean))];
      if (objIds.length > 0) {
        const { data: objData } = await supabase.from('objectives').select('id, name').in('id', objIds);
        const objMap = Object.fromEntries(objData?.map(o => [o.id, o.name]) || []);
        finalData = rawData.map(r => ({
          ...r,
          objectives: r.current_objective_id ? { name: objMap[r.current_objective_id] || 'Desconocido' } : null
        }));
      }
    }

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

    // Clean up body: Convert empty strings to null for database compatibility (especially dates)
    const cleanedBody = Object.fromEntries(
      Object.entries(body).map(([key, value]) => [
        key, 
        value === '' ? null : value
      ])
    );

    const { data, error } = await supabase
      .from('resources')
      .insert([cleanedBody])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
