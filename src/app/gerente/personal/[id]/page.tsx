import React from 'react';
import { supabase } from '@/lib/supabase';
import { DownloadEvidenceButton } from '@/components/gerente/DownloadEvidenceButton';
import { ShieldCheck, Clock, Camera, FileText, User, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import Link from 'next/link';
import { PayrollPanel } from './PayrollPanel';
import { DocumentPanel } from './DocumentPanel';

export const revalidate = 0;

async function getOperatorData(id: string) {
  try {
    const { data, error } = await supabase
      .from('resources')
      .select(`
        *,
        assigned_objective:objectives(name)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (e) {
    console.error("Error fetching operator:", e);
    return null;
  }
}

async function getShifts(id: string) {
  const { data } = await supabase
    .from('guard_shifts')
    .select('*, objectives(name)')
    .eq('operator_id', id)
    .order('checkin_time', { ascending: false })
    .limit(50);
  return data || [];
}

async function getIncidents(id: string) {
  const { data } = await supabase
    .from('guard_book_entries')
    .select('id, entry_type, status')
    .or(`operator_id.eq.${id},resource_id.eq.${id}`)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  return data || [];
}

async function getEvidence(id: string) {
  try {
    const { data, error } = await supabase
      .from('guard_book_entries')
      .select('*, objectives(name)')
      .or(`operator_id.eq.${id},resource_id.eq.${id}`)
      .neq('entry_type', 'fichaje')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      const { data: fallback } = await supabase
        .from('guard_book_entries')
        .select('*, objectives(name)')
        .eq('operator_id', id)
        .neq('entry_type', 'fichaje')
        .order('created_at', { ascending: false })
        .limit(20);
      return fallback || [];
    }
    return data || [];
  } catch (e) {
    console.error("Error fetching evidence:", e);
    return [];
  }
}

export default async function OperatorProfilePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  
  const operator = await getOperatorData(id);

  if (!operator) {
    return (
      <div className="p-20 text-center space-y-6 bg-zinc-50 min-h-screen">
        <div className="w-20 h-20 bg-white border border-zinc-200 shadow-sm rounded-3xl flex items-center justify-center mx-auto">
          <User size={40} className="text-zinc-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Legajo No Encontrado</h1>
          <p className="text-zinc-400 font-semibold text-sm mt-2">Verificá el número de legajo e intentá nuevamente</p>
        </div>
        <Link href="/gerente/personal">
          <button className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-zinc-800 transition-all">
            Volver al Personal
          </button>
        </Link>
      </div>
    );
  }

  const [shifts, incidents, evidence] = await Promise.all([
    getShifts(id),
    getIncidents(id),
    getEvidence(id)
  ]);

  const total_shifts = shifts.length;

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10 bg-zinc-50 min-h-screen text-zinc-900 pb-32">
      
      {/* OPERATOR HEADER */}
      <div className="bg-white border border-zinc-200 shadow-sm rounded-[2.5rem] p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-zinc-900 flex items-center justify-center text-xl font-black text-white shrink-0 border-2 border-[#D4AF37]">
            {operator.avatar_url ? (
              <img src={operator.avatar_url} alt={operator.name} className="w-full h-full object-cover rounded-2xl" />
            ) : (
              operator.name?.substring(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-black text-zinc-900 tracking-tight uppercase">{operator.name}</h1>
              <span className="px-3 py-1 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                {operator.role || 'Operador'}
              </span>
            </div>
            <p className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-wider">
              Legajo #{operator.credential_number || operator.id.substring(0, 8)} · DNI {operator.dni || 'S/N'}
            </p>
            {operator.address && (
              <p className="text-[11px] text-zinc-500 font-semibold mt-0.5">{operator.address}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 border-t md:border-t-0 border-zinc-100 pt-4 md:pt-0">
          <div className="text-right">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Tarifa Hora</p>
            <p className="text-xl font-black font-mono text-[#D4AF37]">${(operator.hourly_pay_rate || 3500).toLocaleString('es-AR')}/h</p>
          </div>
        </div>
      </div>

      {/* CÓMPUTO DE HABERES & LIQUIDACIÓN */}
      <PayrollPanel 
        operatorId={operator.id}
        operatorName={operator.name}
        operatorRole={operator.role}
        initialRate={operator.hourly_pay_rate || 3500}
        shifts={shifts} 
      />

      {/* DOCUMENTACIÓN DEL LEGAJO */}
      <DocumentPanel 
        operatorId={operator.id} 
        initialDocuments={operator.documents || []} 
      />

      {/* DIGITAL EVIDENCE GALLERY & REPORTE DE NOVEDADES */}
      <div className="bg-white border border-zinc-200 shadow-sm rounded-[2.5rem] p-8 md:p-10 print:hidden">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-zinc-900 flex items-center gap-3">
              <Camera size={24} className="text-[#D4AF37]" /> Archivo de Evidencia Digital y Novedades
            </h2>
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mt-1">
              Registro auditado de reportes, fotos e incidentes enviados en campo
            </p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest bg-zinc-900 text-white px-5 py-2 rounded-xl">
            {evidence.length} Registros Forenses
          </span>
        </div>
        
        {evidence.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {evidence.map((doc: any) => {
              const hasImage = !!doc.image_url;
              return (
                <div key={doc.id} className="group relative rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-50 hover:border-[#D4AF37]/50 transition-all shadow-sm flex flex-col justify-between p-5 space-y-4">
                  {hasImage ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-200 bg-black">
                      <DownloadEvidenceButton doc={doc} operatorName={operator.name} />
                      <img src={doc.image_url} alt="Evidencia" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-500" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between border-b border-zinc-200/60 pb-3">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5",
                        doc.urgency === 'critica' || doc.entry_type === 'emergencia' ? "bg-red-100 text-red-700 border border-red-200" :
                        doc.entry_type === 'incidente' ? "bg-amber-100 text-amber-800 border border-amber-200" :
                        "bg-zinc-100 text-zinc-700 border border-zinc-200"
                      )}>
                        {doc.urgency === 'critica' || doc.entry_type === 'emergencia' ? <AlertTriangle size={12} /> : <FileText size={12} />}
                        {doc.entry_type || 'Reporte'}
                      </span>
                      <span className="text-[9px] font-bold text-zinc-400 font-mono">
                        {new Date(doc.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                      </span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest truncate">
                      📍 {doc.objectives?.name || 'Puesto de Servicio'}
                    </p>
                    <p className="text-xs font-bold text-zinc-800 line-clamp-3 leading-relaxed">
                      {doc.content || 'Reporte registrado sin observaciones'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-zinc-200/60 flex items-center justify-between text-[10px] text-zinc-400 font-medium">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Clock size={12} />
                      <span>{new Date(doc.created_at).toLocaleDateString('es-AR')} {new Date(doc.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {doc.status && (
                      <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        {doc.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center border-2 border-dashed border-zinc-200 rounded-3xl bg-zinc-50">
            <FileText size={48} className="text-zinc-300 mx-auto mb-4" />
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">No se han registrado novedades para este operativo</p>
          </div>
        )}
      </div>
    </div>
  );
}
