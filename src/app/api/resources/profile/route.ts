import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    const email = searchParams.get('email');

    if (!userId && !email) {
      return NextResponse.json({ error: 'User ID or Email is required' }, { status: 400 });
    }

    // ALWAYS use Service Role to bypass RLS for profile linking and objective mapping
    const supabase = createServiceClient();

    let resource: any = null;
    let debug: any = { userId, email };

    // 🔗 PROACTIVE LINKING & SELF-HEALING: 
    if (userId && userId !== 'recurso_demo') {
      // 1. Primary: Search by ID or Assigned_to
      const { data: primary } = await supabase
        .from('resources')
        .select('*')
        .or(`id.eq.${userId},assigned_to.eq.${userId}`)
        .limit(1)
        .maybeSingle();
      
      if (primary) {
        resource = primary;
        debug.foundBy = 'primary_id';
      }

      // 2. Secondary: Try by Email
      if (!resource && email) {
        const { data: byEmail } = await supabase
          .from('resources')
          .select('*')
          .ilike('email', email.toLowerCase().trim())
          .limit(1)
          .maybeSingle();
        
        if (byEmail) {
          debug.foundBy = 'email';
          if (!byEmail.assigned_to) {
            const { data: updated } = await supabase
              .from('resources')
              .update({ assigned_to: userId })
              .eq('id', byEmail.id)
              .select().single();
            resource = updated;
            debug.action = 'linked_by_email';
          } else {
            resource = byEmail;
          }
        }
      }

      // 3. (Removed hardcoded tertiary search)
      if (!resource) {
        debug.action = 'resource_not_found';
      }
    }

    if (!resource) {
      return NextResponse.json({ 
        error: 'Resource not found', 
        debug,
        name: email ? email.split('@')[0] : 'Operador (Enlazando...)',
        isRecovering: true 
      });
    }

    if (resource.current_objective_id) {
      const { data: objective } = await supabase
        .from('objectives')
        .select('*')
        .eq('id', resource.current_objective_id)
        .maybeSingle();
      
      if (objective) {
        resource.objectives = objective;
      }
    }

    return NextResponse.json({ ...resource, debug });
  } catch (error: any) {
    console.error('[PROFILE_API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
