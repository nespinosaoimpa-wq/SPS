import React from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { DownloadEvidenceButton } from '@/components/gerente/DownloadEvidenceButton';
import { ShieldCheck, Crosshair, Package, AlertTriangle, Clock, Camera, FileText, Download } from 'lucide-react';
export const revalidate = 0; // Disable static cache for live data

export default async function OperatorProfilePage({ params }: { params: { id: string } }) {
  const { id } = params;

  // 1. Fetch resource details
  const { data: operator } = await supabase
    .from('resources')
    .select(`
      *,
      assigned_objective:objectives(name)
    `)
    .eq('id', id)
    .maybeSingle();

  if (!operator) return <div className="p-10 text-white font-black uppercase">Operador no encontrado</div>;

  // 2. Fetch last 5 shifts (historial)
  const { data: shifts } = await supabase
    .from('guard_shifts')
    .select('*, objectives(name)')
    .eq('operator_id', id)
    .order('checkin_time', { ascending: false })
    .limit(5);

  // 3. Calculate KPIs
  let checkins_on_time = 0;
  let total_shifts = shifts?.length || 0;
  
  if (shifts) {
    shifts.forEach(s => {
      if (s.checkout_time) checkins_on_time++; // Dummy logic for demo
    });
  }

  const coverage = total_shifts > 0 ? Math.round((checkins_on_time / total_shifts) * 100) : 100;

  // 4. Incident Recidivism
  const { data: incidents } = await supabase
    .from('guard_book_entries')
    .select('id, entry_type, status')
    .eq('operator_id', id)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const abandon_count = incidents?.filter(i => i.entry_type === 'abandono_zona').length || 0;
  const critical_count = incidents?.filter(i => i.status === 'crítica').length || 0;

  // 5. Fetch Digital Evidence
  const { data: evidence } = await supabase
    .from('digital_evidence')
    .select('*, objectives(name)')
    .eq('operator_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8 bg-zinc-950 min-h-screen text-zinc-100">
      
      {/* HEADER: Expediente Táctico */}
      <div className="flex items-center gap-6 pb-6 border-b border-white/10">
        <div className="w-24 h-24 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex flex-col items-center justify-center p-1">
           {operator.avatar_url ? (
             <img src={operator.avatar_url} className="w-full h-full object-cover rounded-xl" alt="Avatar" />
           ) : (
             <ShieldCheck size={40} className="text-[#D4AF37]" />
           )}
        </div>
        <div>
          <h1 className="text-4xl font-black text-zinc-100 tracking-tighter uppercase">{operator.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 px-3 py-1 rounded-full border border-[#D4AF37]/20">
              {operator.role || 'Operador'}
            </span>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
              ID: {operator.id?.split('-')[0]}
            </span>
          </div>
        </div>
      </div>

      {/* KPIs GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Efectividad Cobertura</p>
            <Crosshair className="text-emerald-400" size={16} />
          </div>
          <p className="text-4xl font-black tabular-nums">{coverage}%</p>
          <p className="text-[10px] text-zinc-500 font-bold uppercase mt-2">Basado en rondines</p>
        </Card>

        <Card className="p-6 bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Reincidencia Abandono</p>
            <AlertTriangle className={abandon_count > 0 ? "text-red-500" : "text-emerald-400"} size={16} />
          </div>
          <p className="text-4xl font-black tabular-nums text-red-500">{abandon_count}</p>
          <p className="text-[10px] text-zinc-500 font-bold uppercase mt-2">Eventos últimos 7 días</p>
        </Card>

        <Card className="p-6 bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Novedades Críticas</p>
            <AlertTriangle className="text-amber-500" size={16} />
          </div>
          <p className="text-4xl font-black tabular-nums">{critical_count}</p>
          <p className="text-[10px] text-zinc-500 font-bold uppercase mt-2">Eventos últimos 7 días</p>
        </Card>
      </div>

      {/* DOS COLUMNAS: HISTORIAL Y EQUIPAMIENTO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* HISTORIAL */}
        <Card className="p-6 bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl">
          <h2 className="text-xl font-black uppercase tracking-tighter mb-6 text-[#D4AF37] flex items-center gap-2">
            <Clock size={18} /> Historial Operativo
          </h2>
          <div className="space-y-4">
            {shifts?.map((shift: any) => (
              <div key={shift.id} className="p-4 bg-black/40 rounded-2xl border border-white/5 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <p className="font-black text-sm uppercase tracking-tight">{shift.objectives?.name || 'Móvil'}</p>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                    {new Date(shift.checkin_time).toLocaleDateString('es-AR')}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
                  <span className="bg-zinc-900 px-2 py-1 rounded">IN: {new Date(shift.checkin_time).toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'})}</span>
                  <span className="bg-zinc-900 px-2 py-1 rounded">OUT: {shift.checkout_time ? new Date(shift.checkout_time).toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'}) : 'CURSO'}</span>
                </div>
              </div>
            ))}
            {(!shifts || shifts.length === 0) && <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Sin historial de turnos</p>}
          </div>
        </Card>

        {/* EQUIPAMIENTO */}
        <Card className="p-6 bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl">
          <h2 className="text-xl font-black uppercase tracking-tighter mb-6 text-[#D4AF37] flex items-center gap-2">
            <Package size={18} /> Asignación de Activos
          </h2>
          <div className="p-6 text-center border-2 border-dashed border-white/10 rounded-3xl bg-black/20">
            <Package size={32} className="text-zinc-600 mx-auto mb-3" />
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Los activos se asignan por objetivo.</p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">El operador actualiza el estado al iniciar el turno.</p>
          </div>
        </Card>

      </div>

      {/* GALERÍA DE EVIDENCIA DIGITAL */}
      <Card className="p-6 bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black uppercase tracking-tighter text-[#D4AF37] flex items-center gap-2">
            <Camera size={18} /> Evidencia Digital (Despapelización)
          </h2>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{evidence?.length || 0} Documentos</span>
        </div>
        
        {evidence && evidence.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {evidence.map((doc: any) => (
              <div key={doc.id} className="group relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-[3/4]">
                <DownloadEvidenceButton doc={doc} operatorName={operator.name} />
                <img src={doc.image_url} alt="Evidencia" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-4 flex flex-col justify-end">
                  <p className="text-xs font-black text-[#D4AF37] uppercase truncate">{doc.objectives?.name}</p>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase">{new Date(doc.created_at).toLocaleString('es-AR')}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center border-2 border-dashed border-white/10 rounded-3xl bg-black/20">
            <FileText size={32} className="text-zinc-600 mx-auto mb-3" />
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Sin actas digitalizadas.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
