import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const { data: shifts, error } = await supabase
      .from('guard_shifts')
      .select(`
        *,
        resource:resources(name, hourly_rate),
        objective:objectives(name)
      `)
      .not('check_out', 'is', null)
      .order('check_in', { ascending: false });

    if (error) throw error;

    let filtered = shifts || [];
    
    if (startDate) {
      filtered = filtered.filter(s => new Date(s.check_in) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(s => new Date(s.check_out) <= new Date(endDate));
    }

    const payrollData = filtered.map(shift => {
      const start = new Date(shift.check_in);
      const end = new Date(shift.check_out);
      const durationMs = end.getTime() - start.getTime();
      const durationMins = durationMs / 60000;
      const durationHours = durationMins / 60;
      const rate = 3500; // TARIFA ESTÁNDAR TÁCTICA
      const totalAmount = durationHours * rate;

      return {
        id: shift.id,
        operator_name: shift.resource?.name || 'Operador Desconocido',
        objective_name: shift.objective?.name || 'General',
        check_in: shift.check_in,
        check_out: shift.check_out,
        total_minutes: Math.round(durationMins),
        total_hours: parseFloat(durationHours.toFixed(2)),
        hourly_rate: 3500,
        total_amount: parseFloat(totalAmount.toFixed(2))
      };
    });

    return NextResponse.json(payrollData);
  } catch (error: any) {
    console.error('Payroll API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
