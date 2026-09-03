import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json().catch(() => ({}));
    
    const operatorEmail = (body.email || '').toLowerCase().trim();
    const operatorName = body.name || 'Operador 704';

    if (!operatorEmail) {
      return NextResponse.json({ error: 'Email es requerido' }, { status: 400 });
    }

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

    // 2. Upsert in authorized_users table with role 'operador'
    try {
      await supabase
        .from('authorized_users')
        .upsert({
          email: operatorEmail,
          role: 'operador',
          status: 'approved',
          approved_at: new Date().toISOString()
        }, { onConflict: 'email' });
    } catch (e) {}

    // 3. Update public.users table if user registered
    try {
      await supabase
        .from('users')
        .update({ role: 'operador' })
        .ilike('email', operatorEmail);
    } catch (e) {}

    // 4. Update Supabase Auth user metadata
    try {
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUser = authUsers?.users?.find(u => u.email?.toLowerCase().trim() === operatorEmail);
      if (authUser?.id) {
        await supabase.auth.admin.updateUserById(authUser.id, {
          user_metadata: { ...authUser.user_metadata, role: 'operador' }
        });
      }
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
