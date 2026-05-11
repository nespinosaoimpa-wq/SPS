import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/payroll?from=YYYY-MM-DD&to=YYYY-MM-DD&operator_id=X
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const operatorId = searchParams.get('operator_id');

    const supabase = createServiceClient();

    let query = supabase
      .from('guard_shifts')
      .select(`
        id,
        operator_id,
        objective_id,
        checkin_time,
        checkout_time,
        duration_minutes,
        overtime_minutes,
        status,
        resources!operator_id (name),
        objectives!objective_id (name)
      `)
      .eq('status', 'completado')
      .order('checkin_time', { ascending: false });

    if (from) query = query.gte('checkin_time', `${from}T00:00:00Z`);
    if (to) query = query.lte('checkin_time', `${to}T23:59:59Z`);
    if (operatorId) query = query.eq('operator_id', operatorId);

    const { data: shifts, error } = await query;
    if (error) throw error;

    // Aggregate by operator
    const summary: Record<string, any> = {};
    for (const s of (shifts || [])) {
      if (!summary[s.operator_id]) {
        summary[s.operator_id] = {
          operator_id: s.operator_id,
          operator_name: (s.resources as any)?.name || s.operator_id,
          shifts_count: 0,
          total_minutes: 0,
          overtime_minutes: 0,
          objectives: new Set(),
          shifts: [],
        };
      }
      const op = summary[s.operator_id];
      op.shifts_count++;
      op.total_minutes += s.duration_minutes || 0;
      op.overtime_minutes += s.overtime_minutes || 0;
      if (s.objective_id) op.objectives.add((s.objectives as any)?.name || s.objective_id);
      op.shifts.push(s);
    }

    const result = Object.values(summary).map((op: any) => ({
      ...op,
      objectives: Array.from(op.objectives),
      total_hours: +(op.total_minutes / 60).toFixed(2),
      overtime_hours: +(op.overtime_minutes / 60).toFixed(2),
      regular_hours: +((op.total_minutes - op.overtime_minutes) / 60).toFixed(2),
    }));

    return NextResponse.json({ summary: result, shifts: shifts || [] });
  } catch (error: any) {
    console.error('[PAYROLL]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
