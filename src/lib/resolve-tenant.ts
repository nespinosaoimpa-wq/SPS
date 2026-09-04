/**
 * 704 / SPS Prototipo — resolve-tenant.ts
 * Función centralizada de resolución de tenant_id para API Routes.
 */

import { createServiceClient } from '@/lib/supabase-server';
import { NextRequest } from 'next/server';

export const MASTER_TENANT_ID = 'a1b2c3d4-0001-0001-0001-000000000001';

export interface ResolvedTenant {
  tenantId: string | null;
  isSuper: boolean;
  userId: string | null;
  userEmail: string | null;
  userRole: string;
  userName: string | null;
}

export async function resolveTenantFromRequest(req: NextRequest): Promise<ResolvedTenant | null> {
  const userCookie = req.cookies.get('SIGPAD_user') || req.cookies.get('704_user') || req.cookies.get('SPS_user');
  if (!userCookie?.value) {
    // Default to 704 Master Tenant if request comes from 704 app context
    return {
      tenantId: MASTER_TENANT_ID,
      isSuper: false,
      userId: null,
      userEmail: null,
      userRole: 'operador',
      userName: null,
    };
  }

  let cookieUser: any;
  try {
    cookieUser = JSON.parse(decodeURIComponent(userCookie.value));
  } catch {
    return {
      tenantId: MASTER_TENANT_ID,
      isSuper: false,
      userId: null,
      userEmail: null,
      userRole: 'operador',
      userName: null,
    };
  }

  const userId: string | null = cookieUser?.id || null;
  const userEmail: string | null = (cookieUser?.email || '').toLowerCase().trim() || null;
  const userRole: string = (cookieUser?.role || cookieUser?.user_metadata?.role || 'operador').toLowerCase();
  const userName: string | null = cookieUser?.name || cookieUser?.user_metadata?.full_name || null;

  const isSuperAdminEmail = userEmail === 'sigpad.info@gmail.com';
  const isSuperRole = userRole === 'superadmin';
  const isSuper = isSuperAdminEmail && isSuperRole;

  if (isSuper) {
    return {
      tenantId: null,
      isSuper: true,
      userId,
      userEmail,
      userRole,
      userName,
    };
  }

  const cookieTenantId = cookieUser?.tenant_id || cookieUser?.user_metadata?.tenant_id || null;
  if (cookieTenantId && isValidUUID(cookieTenantId)) {
    return {
      tenantId: cookieTenantId,
      isSuper: false,
      userId,
      userEmail,
      userRole,
      userName,
    };
  }

  if (!userId && !userEmail) {
    return {
      tenantId: MASTER_TENANT_ID,
      isSuper: false,
      userId,
      userEmail,
      userRole,
      userName,
    };
  }

  try {
    const supabase = createServiceClient();

    if (userEmail) {
      const { data: authU } = await supabase
        .from('authorized_users')
        .select('tenant_id')
        .ilike('email', userEmail)
        .not('tenant_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (authU?.tenant_id && isValidUUID(authU.tenant_id)) {
        return { tenantId: authU.tenant_id, isSuper: false, userId, userEmail, userRole, userName };
      }
    }

    if (userEmail) {
      const { data: res } = await supabase
        .from('resources')
        .select('tenant_id')
        .ilike('email', userEmail)
        .not('tenant_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (res?.tenant_id && isValidUUID(res.tenant_id)) {
        return { tenantId: res.tenant_id, isSuper: false, userId, userEmail, userRole, userName };
      }
    }

    if (userId && isValidUUID(userId)) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', userId)
        .not('tenant_id', 'is', null)
        .maybeSingle();
      if (dbUser?.tenant_id && isValidUUID(dbUser.tenant_id)) {
        return { tenantId: dbUser.tenant_id, isSuper: false, userId, userEmail, userRole, userName };
      }
    }
  } catch (err: any) {
    console.error('[resolve-tenant 704] Error:', err?.message);
  }

  return {
    tenantId: MASTER_TENANT_ID,
    isSuper: false,
    userId,
    userEmail,
    userRole,
    userName,
  };
}

export function isValidUUID(uuid: any): boolean {
  if (typeof uuid !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}
