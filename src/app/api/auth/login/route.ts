import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password, role: requestedRole } = await request.json();
    const supabase = createClient();

    // Master PIN for testing/demo purposes
    const isMasterOperator = password === '7042026' || password === 'Sps2026' || password === 'SPS2026';
    const isMasterAdmin = password === '1234';

    if (isMasterAdmin || isMasterOperator) {
      // If it's a master password for personnel, we check if the email exists in resources
      if (isMasterOperator) {
        const lowerEmail = email.toLowerCase().trim();

        // 🛡️ TACTICAL BYPASS: Ensure the main manager can always get in with Master PIN
        if (lowerEmail === 'nespinosa.oimpa@gmail.com') {
          console.log(`[AUTH] Tactical bypass triggered for ${lowerEmail}`);
          return NextResponse.json({ 
            user: { 
              email: lowerEmail, 
              role: 'gerente', 
              id: 'manager-nico', 
              name: 'Nico Espinosa' 
            },
            session: { access_token: 'demo-token-bypass' } 
          });
        }

        const { data: resources, error: resError } = await supabase
          .from('resources')
          .select('id, name, role, status')
          .ilike('email', lowerEmail)
          .neq('status', 'baja')
          .order('created_at', { ascending: false })
          .limit(1);
        
        const resource = resources?.[0];

        if (!resource) {
          console.error(`[AUTH] Login failed: Resource with email ${lowerEmail} not found or status is 'baja'.`);
          return NextResponse.json({ 
            error: `IDENTIDAD NO ENCONTRADA: El correo ${lowerEmail} no est registrado como personal activo. Verifique con su administrador.` 
          }, { status: 401 });
        }

        // Determine effective role based on resource role
        // If the role in DB contains 'gerente' (case insensitive), we grant gerente role
        const dbRole = (resource.role || '').toLowerCase();
        const effectiveRole = dbRole.includes('gerente') ? 'gerente' : 'operador';
        
        console.log(`[AUTH] Master PIN Login Success for ${lowerEmail} as ${effectiveRole}`);

        return NextResponse.json({ 
          user: { 
            email, 
            role: effectiveRole, 
            id: resource.id, 
            name: resource.name 
          },
          session: { access_token: 'demo-token-tactical' } 
        });
      }

      console.log(`[AUTH] Admin Master PIN used for ${email}`);
      return NextResponse.json({ 
        user: { email, role: requestedRole || 'gerente', id: 'demo-user' },
        session: { access_token: 'demo-token' } 
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error(`[AUTH] Supabase Auth Error: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // After successful sign in, fetch the role from our users table or metadata
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single();

    const role = profile?.role || data.user.user_metadata?.role || 'operador';

    return NextResponse.json({ 
      user: {
        ...data.user,
        role: role
      }, 
      session: data.session 
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
