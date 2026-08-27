import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json().catch(() => ({}));
    
    const operatorEmail = (body.email || 'horaciocaliba34@gmail.com').toLowerCase().trim();
    const operatorName = body.name || 'Horacio Caliba';

    // 1. Check if existing in resources
    const { data: existing } = await supabase
      .from('resources')
      .select('id, role, status')
      .ilike('email', operatorEmail)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('resources')
        .update({
          name: operatorName,
          role: 'vigilador',
          status: 'active'
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('resources')
        .insert({
          name: operatorName,
          email: operatorEmail,
          role: 'vigilador',
          status: 'active'
        });
    }

    // 2. Upsert in authorized_users
    try {
      await supabase
        .from('authorized_users')
        .upsert({
          email: operatorEmail,
          role: 'operador',
          status: 'approved'
        }, { onConflict: 'email' });
    } catch (e) {}

    return NextResponse.json({ 
      success: true,
      message: `El usuario ${operatorEmail} fue configurado exitosamente como OPERADOR activo.`, 
      email: operatorEmail
    });
  } catch (error: any) {
    console.error('[SETUP_OPERATOR_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
