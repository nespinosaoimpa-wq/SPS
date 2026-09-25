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

    return NextResponse.json(allItems, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
      },
    });
  } catch (error: any) {
    console.error('[INVENTORY_GET_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const itemName = body.item_name || body.name || 'Nuevo Elemento';
    const category = body.category || 'otros';
    const status = body.status || body.condition || 'operativo';
    const serialNumber = body.serial_number || null;
    const objectiveId = body.objective_id || null;
    const notes = body.notes || null;
    const quantity = Math.max(1, parseInt(body.quantity) || 1);

    const itemsToInsert = Array.from({ length: quantity }, (_, idx) => ({
      item_name: itemName,
      serial_number: quantity > 1 && serialNumber ? `${serialNumber}-${idx + 1}` : serialNumber,
      category: category,
      status: status,
      objective_id: objectiveId,
      notes: notes,
    }));

    const { data, error } = await supabase
      .from('resource_inventory')
      .insert(itemsToInsert)
      .select();

    if (error) {
      console.error('[INVENTORY_POST_ERROR]', error);
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[INVENTORY_POST_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Se requiere el ID del elemento' }, { status: 400 });
    }

    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.item_name !== undefined) payload.item_name = updates.item_name;
    if (updates.name !== undefined && updates.item_name === undefined) payload.item_name = updates.name;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.serial_number !== undefined) payload.serial_number = updates.serial_number;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.condition !== undefined && updates.status === undefined) payload.status = updates.condition;
    if (updates.objective_id !== undefined) payload.objective_id = updates.objective_id;
    if (updates.notes !== undefined) payload.notes = updates.notes;

    const { data, error } = await supabase
      .from('resource_inventory')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[INVENTORY_PATCH_ERROR]', error);
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
