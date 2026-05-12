import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { status, comment } = await request.json();
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('geofencing_incidents')
      .update({
        status,
        supervisor_comment: comment
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[RESOLVE_INCIDENT]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
