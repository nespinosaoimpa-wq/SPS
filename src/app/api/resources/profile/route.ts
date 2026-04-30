import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    const email = searchParams.get('email');

    if (!userId && !email) {
      return NextResponse.json({ error: 'User ID or Email is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    let supabase = createServerClient(
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

    // Use Service Role Key to bypass RLS for this specific tactical profile fetch
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }

    let query = supabase
      .from('resources')
      .select('*');

    if (userId && userId !== 'recurso_demo') {
      query = query.or(`id.eq.${userId},assigned_to.eq.${userId}`);
    } else if (email) {
      query = query.ilike('email', email.toLowerCase().trim());
    } else {
      return NextResponse.json({ error: 'Invalid search parameters' }, { status: 400 });
    }

    let { data: resource, error } = await query.maybeSingle();

    if (error) throw error;

    // 🔗 PROACTIVE LINKING & SELF-HEALING: 
    if (!resource && userId && userId !== 'recurso_demo') {
      // 1. Try by Email as a second chance
      if (email) {
        const { data: byEmail } = await supabase
          .from('resources')
          .select('*')
          .ilike('email', email.toLowerCase().trim())
          .maybeSingle();
        
        if (byEmail) {
          if (!byEmail.assigned_to) {
            const { data: updated } = await supabase
              .from('resources')
              .update({ assigned_to: userId })
              .eq('id', byEmail.id)
              .select().single();
            resource = updated;
          } else {
            resource = byEmail;
          }
        }
      }

      // 2. Fallback to Name Search (Self-healing for missing emails)
      if (!resource) {
        // We look for a record with name Nicolas Perez that has NO email or a different one
        // and try to adopt it.
        const { data: byName } = await supabase
          .from('resources')
          .select('*')
          .ilike('name', '%Nicolas Perez%')
          .maybeSingle();
        
        if (byName && (!byName.assigned_to || !byName.email)) {
          const { data: updated } = await supabase
            .from('resources')
            .update({ 
              assigned_to: userId,
              email: email?.toLowerCase().trim()
            })
            .eq('id', byName.id)
            .select().single();
          resource = updated;
          console.log(`[PROFILE_API] Self-healed resource ${byName.id} with email ${email}`);
        }
      }
    }

    if (resource && resource.current_objective_id) {
      const { data: objective } = await supabase
        .from('objectives')
        .select('*')
        .eq('id', resource.current_objective_id)
        .maybeSingle();
      
      if (objective) {
        resource.objectives = objective;
      }
    }

    return NextResponse.json(resource || null);
  } catch (error: any) {
    console.error('[PROFILE_API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
