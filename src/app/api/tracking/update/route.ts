import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createClient();

    const { shiftData, latitude, longitude, accuracy, speed, heading } = body;
    
    if (!shiftData?.operator_id || !latitude || !longitude) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tracking_logs')
      .insert({
        resource_id: shiftData.operator_id,
        guard_log_id: shiftData.id,
        latitude,
        longitude,
        accuracy,
        recorded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
