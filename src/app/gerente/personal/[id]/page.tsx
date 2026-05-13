import React, { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { DownloadEvidenceButton } from '@/components/gerente/DownloadEvidenceButton';
import { ShieldCheck, Crosshair, Package, AlertTriangle, Clock, Camera, FileText, Loader2, User } from 'lucide-react';
import Link from 'next/link';
import { PayrollPanel } from './PayrollPanel';

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
    .limit(5);
  return data || [];
}

async function getIncidents(id: string) {
  const { data } = await supabase
    .from('guard_book_entries')
    .select('id, entry_type, status')
    .eq('operator_id', id)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  return data || [];
}

async function getEvidence(id: string) {
  const { data } = await supabase
    .from('digital_evidence')
    .select('*, objectives(name)')
    .eq('operator_id', id)
    .order('created_at', { ascending: false })
    .limit(8);
  return data || [];
}

export default async function OperatorProfilePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  
  const operator = await getOperatorData(id);

  if (!operator) {
    return (
      <div className="p-20 text-center space-y-6 bg-zinc-950 min-h-screen">
        <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto border border-white/5 shadow-2xl">
          <User size={40} className="text-zinc-700" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Legajo No Encontrado</h1>
          <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest mt-2">ID Interno: {id}</p>
        </div>
        <Link href="/gerente/personal">
          <button className="px-8 py-3 bg-zinc-900 text-zinc-400 hover:text-white border border-white/5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all">
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
  const abandon_count = incidents.filter(i => i.entry_type === 'abandono_zona').length;
  const critical_count = incidents.filter(i => i.status === 'crítica').length;
  const coverage = total_shifts > 0 ? 100 : 0; // Simplified for demo

  const expiryDate = operator.credential_expiry ? new Date(operator.credential_expiry) : null;
  const isExpiringSoon = expiryDate ? (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24) < 30 : false;

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-12 bg-zinc-950 min-h-screen text-zinc-100 pb-32">
      
      {/* CORPORATE HEADER */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-10 pb-12 border-b border-white/10">
        <div className="relative group">
          <div className="absolute -inset-2 bg-gradient-to-r from-[#D4AF37] to-[#b08d29] rounded-[2.5rem] blur-xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative w-40 h-40 rounded-[2.5rem] bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden shadow-tactical">
             {operator.avatar_url ? (
               <img src={operator.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
             ) : (
               <ShieldCheck size={60} className="text-[#D4AF37]/30" />
             )}
          </div>
          <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-[#D4AF37] rounded-2xl flex items-center justify-center border-4 border-zinc-950 shadow-2xl">
             <ShieldCheck size={20} className="text-black" />
          </div>
        </div>

        <div className="text-center md:text-left flex-1 space-y-6">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
            <span className="status-label border-primary/20 text-primary bg-primary/5">
              {operator.role || 'Prestador de Elite'}
            </span>
            <span className="status-label bg-zinc-900/50 text-zinc-500 data-mono">
              SPS-{operator.id?.split('-')[0].toUpperCase()}
            </span>
          </div>
          <h1 className="text-6xl text-white">
            {operator.name}
          </h1>
          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="status-dot bg-emerald-500" />
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
              Estado: Activo en {operator.assigned_objective?.name || 'Área de Cobertura'}
            </p>
          </div>

          {/* INFORMACIÓN DEL PRESTADOR */}
          <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-xl p-5 grid grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-6 mt-8">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">DNI / Documento</p>
              <p className="text-zinc-100 font-medium text-sm">{operator.dni || 'No Registrado'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Correo Electrónico</p>
              <a href={`mailto:${operator.email}`} className="text-zinc-100 font-medium text-sm hover:text-primary transition-colors block truncate">
                {operator.email || 'N/A'}
              </a>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Contacto Directo</p>
              <a href={`tel:${operator.phone}`} className="text-zinc-100 font-medium text-sm hover:text-primary transition-colors">
                {operator.phone || 'Sin Teléfono'}
              </a>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Credencial Nº</p>
              <p className="text-zinc-100 font-medium text-sm">{operator.credential_number || 'PND-704-XXXX'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Vencimiento</p>
              <p className={cn(
                "font-medium text-sm",
                isExpiringSoon ? "text-[#D4AF37] animate-pulse font-black" : "text-zinc-100"
              )}>
                {operator.credential_expiry ? new Date(operator.credential_expiry).toLocaleDateString('es-AR') : 'Indefinido'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 min-w-[200px]">
           <a 
             href={`https://wa.me/${operator.phone?.replace(/\D/g, '')}`} 
             target="_blank" 
             rel="noopener noreferrer"
             className="h-12 px-8 bg-zinc-900 border border-white/5 rounded-2xl font-black uppercase text-[10px] tracking-widest text-zinc-400 hover:text-white transition-all flex items-center justify-center text-center"
           >
             Contactar
           </a>
           <button className="h-12 px-8 btn-premium">
             Ver Desempeño
           </button>
        </div>
      </div>

      {/* KPI TILES: Corporate Intelligence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 print:hidden">
        <div className="card-tactical p-8 relative overflow-hidden group hover:border-primary/20 transition-colors">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Crosshair size={80} className="text-white" />
          </div>
          <p className="status-label mb-6">Eficiencia del Servicio</p>
          <div className="flex items-baseline gap-3">
            <span className="text-6xl font-black tabular-nums text-white tracking-tighter">{coverage}%</span>
            <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">Óptimo</span>
          </div>
          <div className="mt-8 w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${coverage}%` }}></div>
          </div>
        </div>

        <div className="card-tactical p-8 relative overflow-hidden group hover:border-red-500/20 transition-colors">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertTriangle size={80} className="text-white" />
          </div>
          <p className="status-label mb-6">Incidencias de Cobertura</p>
          <div className="flex items-baseline gap-3">
            <span className={cn("text-6xl font-black tabular-nums tracking-tighter", abandon_count > 0 ? "text-[#D4AF37]" : "text-white")}>
              {abandon_count}
            </span>
            <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Últ. 7 días</span>
          </div>
          <p className="text-[10px] font-black text-zinc-700 uppercase mt-6 tracking-[0.2em]">Protocolo de cumplimiento estricto</p>
        </div>

        <div className="card-tactical p-8 relative overflow-hidden group hover:border-amber-500/20 transition-colors">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShieldCheck size={80} className="text-white" />
          </div>
          <p className="status-label mb-6">Incidentes Reportados</p>
          <div className="flex items-baseline gap-3">
            <span className="text-6xl font-black tabular-nums text-white tracking-tighter">{critical_count}</span>
            <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">En Auditoría</span>
          </div>
          <p className="text-[10px] font-black text-zinc-700 uppercase mt-6 tracking-[0.2em]">Monitoreo de seguridad integral</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 print:hidden">
        
        {/* OPERATIONAL LOG */}
        <div className="card-tactical p-10">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-primary flex items-center gap-4">
              <Clock size={24} /> Historial de Turnos
            </h2>
          </div>
          <div className="space-y-4">
            {shifts.map((shift: any) => (
              <div key={shift.id} className="p-6 bg-black/40 rounded-3xl border border-white/5 hover:border-white/10 transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-2">Puesto de Servicio</p>
                    <p className="text-lg font-black uppercase text-white tracking-tight group-hover:text-primary transition-colors">{shift.objectives?.name || 'Unidad Móvil'}</p>
                  </div>
                  <span className="status-label bg-zinc-900 border-none data-mono">
                    {new Date(shift.checkin_time).toLocaleDateString('es-AR')}
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                    <span className="text-[10px] font-black text-zinc-600 uppercase">Check-In:</span>
                    <span className="data-mono text-zinc-300">{new Date(shift.checkin_time).toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-700"></div>
                    <span className="text-[10px] font-black text-zinc-600 uppercase">Check-Out:</span>
                    <span className="data-mono text-zinc-300">{shift.checkout_time ? new Date(shift.checkout_time).toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'}) : 'ACTIVO'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* INVENTORY / ASSETS */}
        <div className="card-tactical p-10 flex flex-col">
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-10 text-primary flex items-center gap-4">
            <Package size={24} /> Activos en Posesión
          </h2>
          <div className="flex-1 flex flex-col justify-center items-center text-center p-10 border-2 border-dashed border-white/5 rounded-[2.5rem] bg-black/20">
            <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-6">
              <Package size={40} className="text-zinc-700" />
            </div>
            <p className="status-label mb-4">Asignación Dinámica</p>
            <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-[0.2em] max-w-[280px] leading-relaxed">
              Los activos son auditados mediante <br/>protocolo QR al inicio de cada servicio para asegurar trazabilidad total.
            </p>
          </div>
          <button className="w-full h-14 bg-zinc-900 border border-white/5 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] text-zinc-500 hover:text-white transition-all mt-8">
            Ver Registro de Inventario
          </button>
        </div>

      </div>

      {/* CÓMPUTO DE HABERES */}
      <PayrollPanel 
        operatorId={operator.id} 
        initialRate={operator.hourly_pay_rate || 3500} 
        shifts={shifts} 
      />

      {/* DIGITAL EVIDENCE GALLERY */}
      <div className="card-tactical p-10 print:hidden">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-primary flex items-center gap-4">
            <Camera size={24} /> Archivo de Evidencia Digital
          </h2>
          <span className="status-label bg-zinc-900 border-white/10 px-6 py-2">
            {evidence.length} Registros Forenses
          </span>
        </div>
        
        {evidence.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {evidence.map((doc: any) => (
              <div key={doc.id} className="group relative rounded-[2.5rem] overflow-hidden border border-white/5 bg-black aspect-[3/4] hover:border-primary/50 transition-all shadow-2xl">
                <DownloadEvidenceButton doc={doc} operatorName={operator.name} />
                <img src={doc.image_url} alt="Evidencia" className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-all duration-700 scale-110 group-hover:scale-100" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-8 flex flex-col justify-end">
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">{doc.objectives?.name}</p>
                  <div className="flex items-center gap-3 opacity-60">
                    <Clock size={12} className="text-zinc-500" />
                    <p className="data-mono text-[10px] font-bold text-zinc-400">{new Date(doc.created_at).toLocaleString('es-AR')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-black/20">
            <FileText size={56} className="text-zinc-800 mx-auto mb-6" />
            <p className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.3em] italic">No se han registrado actas digitales para este operativo</p>
          </div>
        )}
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
