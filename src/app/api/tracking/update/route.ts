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

    const operator_id = shiftData.operator_id;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operator_id);

    // 1. Insert into history tracking logs
    const { data: logData, error: logError } = await supabase
      .from('tracking_logs')
      .insert({
        resource_id: operator_id,
        guard_log_id: shiftData.id,
        latitude,
        longitude,
        accuracy,
        recorded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (logError) {
      console.warn("Tracking Log Insert Error (Non-critical):", logError);
    }

    // 2. Update resource status and position for live map display
    const updatePayload = { 
      latitude, 
      longitude,
      accuracy,
      speed,
      heading,
      last_gps_update: new Date().toISOString(),
      status: 'active' // Ensure status stays active during tracking
    };

    let updateQuery = supabase.from('resources').update(updatePayload);
    
    if (isUUID) {
       // Search by Auth UUID (assigned_to) or the Serial ID
       updateQuery = updateQuery.or(`id.eq."${operator_id}",assigned_to.eq."${operator_id}"`);
    } else {
       updateQuery = updateQuery.eq('id', operator_id);
    }

    const { error: updateError } = await updateQuery;
    if (updateError) throw updateError;

    return NextResponse.json({ success: true, recorded_at: updatePayload.last_gps_update });
  } catch (error: any) {
    console.error("Tracking Update Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
