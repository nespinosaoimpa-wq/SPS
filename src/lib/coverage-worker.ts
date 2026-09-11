import { createServiceClient } from './supabase-server';

export interface CoverageAuditResult {
  auditedCount: number;
  offlineCount: number;
  alertsCreated: number;
  details: Array<{
    operator_id: string;
    operator_name: string;
    status: string;
    minutes_offline: number;
    alarm_triggered: boolean;
  }>;
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export async function runCoverageAudit(): Promise<CoverageAuditResult> {
  const supabase = createServiceClient();
  const nowMs = Date.now();
  const cutoff5Min = new Date(nowMs - FIVE_MINUTES_MS).toISOString();
  const cutoff15Min = new Date(nowMs - FIFTEEN_MINUTES_MS).toISOString();

  // 1. Fetch active shifts (shifts without checkout_time)
  const { data: activeShifts, error: shiftErr } = await supabase
    .from('guard_shifts')
    .select('id, operator_id, objective_id, checkin_time')
    .is('checkout_time', null);

  if (shiftErr || !activeShifts || activeShifts.length === 0) {
    return { auditedCount: 0, offlineCount: 0, alertsCreated: 0, details: [] };
  }

  const operatorIds = Array.from(new Set(activeShifts.map((s: any) => s.operator_id).filter(Boolean)));
  if (operatorIds.length === 0) {
    return { auditedCount: 0, offlineCount: 0, alertsCreated: 0, details: [] };
  }

  // 2. Fetch resource details for these active operators
  const { data: resources, error: resErr } = await supabase
    .from('resources')
    .select('id, name, first_name, last_name, status, last_gps_update, performance_data, current_objective_id')
    .in('id', operatorIds);

  if (resErr || !resources) {
    return { auditedCount: operatorIds.length, offlineCount: 0, alertsCreated: 0, details: [] };
  }

  let offlineCount = 0;
  let alertsCreated = 0;
  const details: CoverageAuditResult['details'] = [];

  for (const resource of resources) {
    // Skip resources already marked as 'baja'
    if (resource.status === 'baja') continue;

    const lastGpsMs = resource.last_gps_update ? new Date(resource.last_gps_update).getTime() : 0;
    const diffMs = nowMs - lastGpsMs;
    const minutesOffline = Math.floor(diffMs / 60000);

    // Check if operator hasn't reported GPS in > 5 minutes
    if (diffMs > FIVE_MINUTES_MS) {
      offlineCount++;
      const operatorName = (resource.name || `${resource.first_name || ''} ${resource.last_name || ''}`).trim() || 'Operador';
      
      // Update resource status to 'sin_cobertura'
      const existingPerf = resource.performance_data || {};
      const updatedAudit = {
        ...(existingPerf.network_audit || {}),
        online_status: 'offline',
        timestamp: new Date().toISOString()
      };

      await supabase
        .from('resources')
        .update({
          status: 'sin_cobertura',
          performance_data: {
            ...existingPerf,
            network_audit: updatedAudit
          }
        })
        .eq('id', resource.id);

      // Check deduplication: Was an alarm triggered for this operator/objective in the last 15 minutes?
      const shiftObjId = resource.current_objective_id || activeShifts.find((s: any) => s.operator_id === resource.id)?.objective_id;

      const { data: recentAlarms } = await supabase
        .from('alarms')
        .select('id')
        .eq('alarm_type', 'perdida_cobertura')
        .gte('created_at', cutoff15Min)
        .or(`operator_id.eq.${resource.id},triggered_by.eq.${resource.id}`)
        .limit(1);

      let alarmTriggered = false;
      if (!recentAlarms || recentAlarms.length === 0) {
        // Insert deduplicated alarm
        const { error: alarmErr } = await supabase
          .from('alarms')
          .insert({
            triggered_by: resource.id,
            operator_id: resource.id,
            objective_id: shiftObjId || null,
            alarm_type: 'perdida_cobertura',
            message: `🚨 ALERTA SIN COBERTURA: Operador ${operatorName} sin señal/pulso GPS desde hace más de ${minutesOffline} minutos.`,
            status: 'active'
          });

        if (!alarmErr) {
          alertsCreated++;
          alarmTriggered = true;
        }
      }

      details.push({
        operator_id: resource.id,
        operator_name: operatorName,
        status: 'sin_cobertura',
        minutes_offline: minutesOffline,
        alarm_triggered: alarmTriggered
      });
    }
  }

  return {
    auditedCount: operatorIds.length,
    offlineCount,
    alertsCreated,
    details
  };
}
