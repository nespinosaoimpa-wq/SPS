import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const objectiveId = searchParams.get('objective_id');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const supabase = createServiceClient();

    // Parallel fetch objectives and both inventory tables to avoid PostgREST join failures
    const [objsRes, invItemsRes, resInvRes] = await Promise.all([
      supabase.from('objectives').select('id, name'),
      supabase.from('inventory_items').select('*').order('created_at', { ascending: false }),
      supabase.from('resource_inventory').select('*').order('created_at', { ascending: false }),
    ]);

    const objMap: Record<string, string> = {};
    (objsRes.data || []).forEach((o: any) => {
      objMap[o.id] = o.name;
    });

    const itemsFromInv = (invItemsRes.data || []).map((item: any) => ({
      id: item.id,
      item_name: item.name || item.item_name || 'Recurso',
      serial_number: item.serial_number || 'S/N',
      category: item.category || 'equipamiento',
      status: item.condition || item.status || 'operativo',
      condition: item.condition || 'operativo',
      objective_id: item.objective_id,
      objectives: item.objective_id && objMap[item.objective_id] ? { name: objMap[item.objective_id] } : null,
      notes: item.notes || item.description || null,
      created_at: item.created_at,
    }));

    const itemsFromResInv = (resInvRes.data || []).map((item: any) => ({
      id: item.id,
      item_name: item.item_name || item.name || 'Recurso',
      serial_number: item.serial_number || 'S/N',
      category: item.category || 'otros',
      status: item.status || 'operativo',
      condition: item.condition || 'operativo',
      objective_id: item.objective_id,
      objectives: item.objective_id && objMap[item.objective_id] ? { name: objMap[item.objective_id] } : null,
      notes: item.notes || null,
      created_at: item.created_at,
    }));

    let allItems = [...itemsFromInv, ...itemsFromResInv];

    if (objectiveId && objectiveId !== 'all') {
      allItems = allItems.filter(i => i.objective_id === objectiveId);
    }
    if (category && category !== 'all') {
      allItems = allItems.filter(i => i.category.toLowerCase() === category.toLowerCase());
    }
    if (status && status !== 'all') {
      allItems = allItems.filter(i => i.status.toLowerCase() === status.toLowerCase());
    }

    return NextResponse.json(allItems);
  } catch (error: any) {
    console.error('[INVENTORY_GET_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const payload = {
      name: body.item_name || body.name,
      item_name: body.item_name || body.name,
      serial_number: body.serial_number || null,
      category: body.category || 'equipamiento',
      condition: body.status || body.condition || 'operativo',
      status: body.status || 'operativo',
      objective_id: body.objective_id || null,
      notes: body.notes || null,
    };

    const { data, error } = await supabase
      .from('inventory_items')
      .insert(payload)
      .select();

    if (error) {
      // Fallback to resource_inventory
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('resource_inventory')
        .insert({
          item_name: payload.name,
          serial_number: payload.serial_number,
          status: 'operativo',
          objective_id: payload.objective_id,
        })
        .select();

      if (fallbackError) throw fallbackError;
      return NextResponse.json(fallbackData);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Se requiere el ID del elemento' }, { status: 400 });
    }

    await supabase.from('inventory_items').delete().eq('id', id);
    await supabase.from('resource_inventory').delete().eq('id', id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
