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

    const supabase = createServiceClient();

    let resource: any = null;
    let debug: any = { userId, email };

    // 🔗 PROACTIVE LINKING & SELF-HEALING: Search resources without failing PostgREST joins
    if (userId && userId !== 'recurso_demo') {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      
      // 1. Primary: Search by ID or Assigned_to
      let resourceQuery = supabase.from('resources').select('*');
      
      if (isUUID) {
        resourceQuery = resourceQuery.or(`id.eq.${userId},assigned_to.eq.${userId}`);
      } else {
        resourceQuery = resourceQuery.eq('id', userId);
      }

      const { data: primaryList } = await resourceQuery.order('status', { ascending: true }).limit(5);
      const primary = primaryList?.find((r: any) => r.status !== 'baja') || primaryList?.[0];

      if (primary && primary.status !== 'baja') {
        resource = primary;
        debug.foundBy = 'primary_id';
      }

      // 2. Secondary: Try by Email
      if (!resource && email) {
        const { data: resourcesByEmail } = await supabase
          .from('resources')
          .select('*')
          .ilike('email', email.toLowerCase().trim())
          .neq('status', 'baja')
          .limit(1);
        
        const byEmail = resourcesByEmail?.[0];
        
        if (byEmail) {
          debug.foundBy = 'email';
          if (!byEmail.assigned_to && userId) {
            await supabase
              .from('resources')
              .update({ assigned_to: userId })
              .eq('id', byEmail.id);
            byEmail.assigned_to = userId;
          }
          resource = byEmail;
        }
      }

      if (!resource && primary) {
        resource = primary;
        debug.foundBy = 'primary_id_legacy_baja';
      }
    }

    // 3. Fallback: Search all active resources by name match if email/id missing
    if (!resource && email) {
      const namePart = email.split('@')[0].toLowerCase();
      const { data: allRes } = await supabase.from('resources').select('*');
      const matched = (allRes || []).find((r: any) => 
        r.name?.toLowerCase().includes(namePart) || 
        namePart.includes(r.name?.toLowerCase().split(' ')[0])
      );
      if (matched) {
        resource = matched;
        debug.foundBy = 'fuzzy_name_match';
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

    // Fetch objective details safely in memory
    let finalObjective: any = null;

    if (resource.current_objective_id) {
      const { data: objective } = await supabase
        .from('objectives')
        .select('*')
        .eq('id', resource.current_objective_id)
        .maybeSingle();
      
      if (objective) {
        finalObjective = objective;
        debug.objectiveFoundBy = 'resource_current_id';
      }
    }

    if (!finalObjective && resource.id) {
      const { data: activeShift } = await supabase
        .from('guard_shifts')
        .select('objective_id')
        .eq('operator_id', resource.id)
        .in('status', ['activo', 'active'])
        .order('checkin_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (activeShift?.objective_id) {
        const { data: shiftObj } = await supabase
          .from('objectives')
          .select('*')
          .eq('id', activeShift.objective_id)
          .maybeSingle();
        if (shiftObj) {
          finalObjective = shiftObj;
          debug.objectiveFoundBy = 'guard_shifts_active';
        }
      }
    }

    resource.objectives = finalObjective || null;

    return NextResponse.json({ ...resource, debug });
  } catch (error: any) {
    console.error('[PROFILE_API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
