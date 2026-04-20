import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClient();

    // Soft delete: set is_active to false
    const { data, error } = await supabase
      .from('objectives')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error deleting objective:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
