import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password, role } = await request.json();
    const supabase = createClient();

    // Master PIN for testing/demo purposes
    if (password === '1234' || password === '7042026') {
      // If it's the operator master password, we check if the email exists in resources
      if (password === '7042026') {
        const lowerEmail = email.toLowerCase().trim();
        // We use .select().ilike() and limit(1) to handle accidental duplicates gracefully
        const { data: resources, error: resError } = await supabase
          .from('resources')
          .select('id, name, role, status')
          .ilike('email', lowerEmail)
          .neq('status', 'baja') // Ensure they are not deactivated
          .order('created_at', { ascending: false }) // Take the newest one if multiple exist
          .limit(1);
        
        const resource = resources?.[0];

        if (!resource) {
          return NextResponse.json({ 
            error: 'Email no registrado como personal activo en el sistema.' 
          }, { status: 401 });
        }

        return NextResponse.json({ 
          user: { 
            email, 
            role: 'operador', 
            id: resource.id, 
            name: resource.name 
          },
          session: { access_token: 'demo-token-operator' } 
        });
      }

      return NextResponse.json({ 
        user: { email, role: role || 'gerente', id: 'demo-user' },
        session: { access_token: 'demo-token' } 
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Optional: Verify role in the 'users' table if needed
    // const { data: userData } = await supabase.from('users').select('role').eq('id', data.user.id).single();
    
    return NextResponse.json({ user: data.user, session: data.session });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
