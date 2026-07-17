import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    
    // Check in authorized_users first (Whitelist table)
    let { data: authUser, error: authError } = await supabase
      .from('authorized_users')
      .select('id, email, role, status')
      .ilike('email', email.toLowerCase().trim())
      .limit(1)
      .maybeSingle();

    if (authError) {
      console.error('[WHITELIST_VERIFY] DB Error (authorized_users):', authError);
    }

    if (authUser && authUser.status === 'approved') {
      return NextResponse.json({ 
        authorized: true, 
        resource: { id: authUser.id, name: email.split('@')[0], role: authUser.role, source: 'authorized_users' } 
      });
    }

    // Fallback: Check in resources table (Legacy/Operator flow)
    const { data: resourceUser, error: resourceError } = await supabase
      .from('resources')
      .select('id, name, role')
      .ilike('email', email.toLowerCase().trim())
      .limit(1)
      .maybeSingle();

    if (resourceError) {
      console.error('[WHITELIST_VERIFY] DB Error (resources):', resourceError);
      return NextResponse.json({ error: 'Error verificando identidad' }, { status: 500 });
    }

    if (!resourceUser) {
      return NextResponse.json({ 
        authorized: false, 
        error: 'CORREO NO AUTORIZADO. Contacte a la gerencia para ser dado de alta como personal primero.' 
      });
    }

    return NextResponse.json({ 
      authorized: true, 
      resource: { ...resourceUser, source: 'resources' } 
    });
  } catch (error: any) {
    console.error('[WHITELIST_VERIFY] Catch:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
