import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json().catch(() => ({}));
    
    const managerEmail = (body.email || 'diegonasimbera078@gmail.com').toLowerCase().trim();
    const managerName = body.name || 'Diego Nasimbera';

    // 1. Check if already in resources
    const { data: existing } = await supabase
      .from('resources')
      .select('id, role, status')
      .ilike('email', managerEmail)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('resources')
        .update({
          name: managerName,
          role: 'Gerente',
          status: 'active'
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('resources')
        .insert({
          name: managerName,
          email: managerEmail,
          role: 'Gerente',
          status: 'active'
        });
    }

    // 2. Upsert in authorized_users table
    try {
      await supabase
        .from('authorized_users')
        .upsert({
          email: managerEmail,
          role: 'gerente',
          status: 'approved'
        }, { onConflict: 'email' });
    } catch (e) {}

    return NextResponse.json({ 
      success: true,
      message: `El usuario ${managerEmail} fue configurado exitosamente como Gerente activo.`, 
      email: managerEmail
    });
  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
