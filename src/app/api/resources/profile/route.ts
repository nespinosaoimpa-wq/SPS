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
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      
      // 1. Primary: Search by ID or Assigned_to (Include objectives join)
      let resourceQuery = supabase.from('resources').select('*, objectives!current_objective_id(*)');
      
      if (isUUID) {
        resourceQuery = resourceQuery.or(`id.eq.${userId},assigned_to.eq.${userId}`);
      } else {
        resourceQuery = resourceQuery.eq('id', userId);
      }

      const { data: primary } = await resourceQuery
        .order('status', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (primary && primary.status !== 'baja') {
        resource = primary;
        debug.foundBy = 'primary_id';
      }

      // 2. Secondary: Try by Email
      if (!resource && email) {
        const { data: resourcesByEmail } = await supabase
          .from('resources')
          .select('*, objectives!current_objective_id(*)')
          .ilike('email', email.toLowerCase().trim())
          .neq('status', 'baja')
          .limit(1);
        
        const byEmail = resourcesByEmail?.[0];
        
        if (byEmail) {
          debug.foundBy = 'email';
          if (!byEmail.assigned_to && userId) {
            const { data: updated } = await supabase
              .from('resources')
              .update({ assigned_to: userId })
              .eq('id', byEmail.id)
              .select('*, objectives!current_objective_id(*)').single();
            resource = updated;
            debug.action = 'linked_by_email_healing';
          } else {
            resource = byEmail;
          }
        }
      }

      if (!resource && primary) {
        resource = primary;
        debug.foundBy = 'primary_id_legacy_baja';
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

    // 🎯 DISCOVERY 2.0: Ensure we have objective details
    // If the operator has been UNLINKED (current_objective_id is null/empty and no active shift),
    // then they HAVE NO OBJECTIVE ASSIGNED! Do NOT fall back to old programmed shifts!
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

    // Only fallback if there is an ACTIVE shift currently in progress (already checked in)
    if (!finalObjective) {
      const { data: activeShift } = await supabase
        .from('guard_shifts')
        .select('objective_id, objectives(*)')
        .eq('operator_id', resource.id)
        .in('status', ['activo', 'active'])
        .order('checkin_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (activeShift?.objectives) {
        finalObjective = activeShift.objectives;
        debug.objectiveFoundBy = 'guard_shifts_active';
      }
    }

    // Explicitly set objectives to finalObjective or null (no stale fallbacks to programmed shifts)
    resource.objectives = finalObjective || null;

    return NextResponse.json({ ...resource, debug });
  } catch (error: any) {
    console.error('[PROFILE_API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
