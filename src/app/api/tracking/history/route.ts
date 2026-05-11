import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!userId || !from || !to) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Consultar logs de GPS ordenados por tiempo
    const { data, error } = await supabase
      .from('gps_tracking')
      .select('latitude, longitude, recorded_at')
      .eq('user_id', userId)
      .gte('recorded_at', from)
      .lte('recorded_at', to)
      .order('recorded_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("Tracking History Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
