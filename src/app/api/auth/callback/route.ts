import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user?.email) {
      const email = data.user.email.toLowerCase().trim();
      
      // Verification: Check if the user is a resource in 704 system
      const { data: resources } = await supabase
        .from('resources')
        .select('id, name, role, status')
        .ilike('email', email)
        .neq('status', 'baja')
        .limit(1);

      const resource = resources?.[0];

      if (resource) {
        // Build the session for the local storage workaround if needed, 
        // though we prefer the server to handle it.
        // For 704 compatibility, we might need to store something or just redirect.
        const response = NextResponse.redirect(`${origin}/operador`);
        
        // We set a temporary cookie that the client-side can use to populate localStorage
        // This is a bridge between Supabase Auth and the current custom persistence
        response.cookies.set('704_auth_temp', JSON.stringify({
          email,
          role: 'operador',
          id: resource.id,
          name: resource.name
        }), { maxAge: 60 });
        
        return response;
      } else {
        // If not a resource, maybe they are a manager? 
        // For now, if not found in resources, we strictly allow nothing or 
        // allow them only if they are the admin (we can check a managers table if it exists)
        return NextResponse.redirect(`${origin}/login?error=Email no autorizado como personal.`);
      }
    }
  }

  // return the user to an error page with some instructions
  return NextResponse.redirect(`${origin}/login?error=Fallo de autenticación.`);
}
