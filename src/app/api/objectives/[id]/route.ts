import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('objectives')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Objetivo no encontrado' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching objective:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // 1. Unassign resources linked to this objective
    await supabase.from('resources').update({ current_objective_id: null }).eq('current_objective_id', id);

    // 2. Perform real delete from Supabase
    const { error: deleteErr } = await supabase
      .from('objectives')
      .delete()
      .eq('id', id);

    if (deleteErr) {
      console.warn("Hard delete failed, performing soft delete:", deleteErr.message);
      // Soft delete fallback if foreign keys exist
      const { error: updateErr } = await supabase
        .from('objectives')
        .update({ 
          is_active: false, 
          status: 'Inactivo', 
          deleted_at: new Date().toISOString() 
        })
        .eq('id', id);
      if (updateErr) throw updateErr;
    }
    
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("Error deleting objective:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
