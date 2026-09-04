import { createClient } from '@/lib/supabase';
import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password, role: requestedRole } = await request.json();
    const supabase = createClient();
    const adminSupabase = createServiceClient();

    // 🛡️ TACTICAL BYPASS & AUTO-REPAIR: Ensure owners and managers get in as Gerente, and operators as Operador
    const lowerEmail = email.toLowerCase().trim();
    const isManagerEmail = lowerEmail === 'nespinosa.oimpa@gmail.com' || lowerEmail === 'diegonasimbera078@gmail.com' || lowerEmail.includes('cerruti');
    const isHoracioOperator = lowerEmail === 'horaciocaliba34@gmail.com';

    if (isHoracioOperator) {
      try {
        const { data: existing } = await adminSupabase
          .from('resources')
          .select('id')
          .ilike('email', lowerEmail)
          .maybeSingle();

        if (existing) {
          await adminSupabase.from('resources').update({
            name: 'Horacio Caliba',
            role: 'vigilador',
            status: 'active'
          }).eq('id', existing.id);
        } else {
          await adminSupabase.from('resources').insert({
            name: 'Horacio Caliba',
            email: lowerEmail,
            role: 'vigilador',
            status: 'active'
          });
        }

        // Auto-sync Supabase auth user password to kiran.14
        try {
          const { data: authUsers } = await adminSupabase.auth.admin.listUsers();
          const horacioUser = authUsers?.users?.find(u => u.email?.toLowerCase() === lowerEmail);
          if (horacioUser) {
            await adminSupabase.auth.admin.updateUserById(horacioUser.id, { password: 'kiran.14', email_confirm: true });
          }
        } catch (e) {}
      } catch (e) {}

      const isHoracioPassword = password === 'kiran.14' || password === '7042026' || password === '1234';
      if (isHoracioPassword) {
        console.log(`[AUTH] Direct operator login for Horacio Caliba with password ${password}`);
        const { data: horacioRes } = await adminSupabase
          .from('resources')
          .select('id, name')
          .ilike('email', lowerEmail)
          .maybeSingle();

        return NextResponse.json({ 
          user: { 
            email: lowerEmail, 
            role: 'operador', 
            id: horacioRes?.id || 'op-horacio-34', 
            name: horacioRes?.name || 'Horacio Caliba' 
          },
          session: { access_token: 'demo-token-horacio' } 
        });
      }
    }

    if (isManagerEmail) {
      // Auto-repair role in DB to ensure zero friction
      const managerName = lowerEmail.includes('cerruti') ? 'Ariel Cerruti' : (lowerEmail.includes('diego') ? 'Diego Nasimbera' : 'Nico Espinosa');
      try {
        const { data: existing } = await adminSupabase
          .from('resources')
          .select('id')
          .ilike('email', lowerEmail)
          .maybeSingle();

        if (existing) {
          await adminSupabase.from('resources').update({
            name: managerName,
            role: 'Gerente',
            status: 'active'
          }).eq('id', existing.id);
        } else {
          await adminSupabase.from('resources').insert({
            name: managerName,
            email: lowerEmail,
            role: 'Gerente',
            status: 'active'
          });
        }
      } catch (e) {}

      const isPersonalPassword = password === 'Nico1905' || password === 'Diego1234' || password === 'Ariel1234' || password === 'gerente123';
      const isMaster = password === '7042026' || password === '1234';

      if (isPersonalPassword || isMaster) {
        console.log(`[AUTH] Tactical manager login for ${lowerEmail}`);
        const { data: managerRes } = await adminSupabase
          .from('resources')
          .select('id, name')
          .ilike('email', lowerEmail)
          .maybeSingle();
          
        return NextResponse.json({ 
          user: { 
            email: lowerEmail, 
            role: 'gerente', 
            id: managerRes?.id || 'M-078', 
            name: managerRes?.name || managerName
          },
          session: { access_token: 'demo-token-bypass' } 
        });
      }
    }

    // Master PIN for testing/demo purposes
    const isMasterOperator = password === '7042026';
    const isMasterAdmin = password === '1234';

    if (isMasterAdmin || isMasterOperator) {
      // If it's a master password for personnel, we check if the email exists in resources
      if (isMasterOperator) {

        const { data: resources, error: resError } = await adminSupabase
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
            error: `IDENTIDAD NO ENCONTRADA: El correo ${lowerEmail} no está registrado como personal activo. Verifique con su administrador.` 
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

    // After successful sign in, fetch the role from our users table or metadata or resources
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single();

    let role = profile?.role || data.user.user_metadata?.role || 'operador';

    // 🔗 AUTO-LINKING & ROLE SYNC: Check resources table for real role
    try {
      const { data: resource } = await adminSupabase
        .from('resources')
        .select('id, role, assigned_to')
        .ilike('email', lowerEmail)
        .neq('status', 'baja')
        .order('status', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (resource) {
        const resRole = (resource.role || '').toLowerCase();
        if (isHoracioOperator) {
          role = 'operador';
        } else if (resRole.includes('gerente') || isManagerEmail) {
          role = 'gerente';
        }
        if (!resource.assigned_to) {
          await adminSupabase
            .from('resources')
            .update({ assigned_to: data.user.id })
            .eq('id', resource.id);
          console.log(`[AUTH] Linked user ${data.user.id} to resource ${resource.id}`);
        }
      }
    } catch (e) {
      console.error('[AUTH] Auto-linking failed:', e);
    }

    if (isManagerEmail) {
      role = 'gerente';
    }
    if (isHoracioOperator) {
      role = 'operador';
    }

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
