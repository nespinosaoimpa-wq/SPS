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

    // 1. Prepare async tasks without awaiting them sequentially
    const tasks = [];

    // Track the log entry silently (no select needed)
    tasks.push(
      supabase.from('tracking_logs').insert({
        resource_id: operator_id,
        guard_log_id: shiftData.id,
        latitude,
        longitude,
        accuracy,
        speed,
        heading,
        recorded_at: new Date().toISOString()
      })
    );

    // 2. Update resource status and position for live map display
    const updatePayload = { 
      latitude, 
      longitude,
      accuracy,
      speed,
      heading,
      last_gps_update: new Date().toISOString(),
      status: 'active' 
    };

    let updateQuery = supabase.from('resources').update(updatePayload);
    if (isUUID) {
       updateQuery = updateQuery.or(`id.eq."${operator_id}",assigned_to.eq."${operator_id}"`);
    } else {
       updateQuery = updateQuery.eq('id', operator_id);
    }
    tasks.push(updateQuery);

    // Execute in parallel mapping to catch potential errors without crashing the main flow
    await Promise.allSettled(tasks);

    return NextResponse.json({ success: true, recorded_at: updatePayload.last_gps_update });
  } catch (error: any) {
    console.error("Tracking Update Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
