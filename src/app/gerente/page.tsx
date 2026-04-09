'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Users, 
  Map as MapIcon, 
  FileText, 
  TrendingUp, 
  Clock, 
  Target, 
  DollarSign, 
  ArrowUpRight,
  Zap,
  MoreVertical,
  ChevronRight,
  Share2,
  Cpu,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const TacticalLeaflet = dynamic(() => import('@/components/gerente/TacticalLeaflet'), { ssr: false });

export default function OperationalHub() {
  const [activeResCount, setActiveResCount] = useState(0);
  const [reports, setReports] = useState<any[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const { count } = await supabase.from('resources').select('*', { count: 'exact', head: true }).eq('status', 'activo');
        setActiveResCount(count || 0);

        const { data: objData } = await supabase.from('objectives').select('*');
        setObjectives(objData || []);

        const { data: incData } = await supabase.from('incident_reports').select('*').order('created_at', { ascending: false }).limit(5);
        setReports(incData || []);
      } catch (e) {
        console.error("Dashboard Sync Error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();

    const channel = supabase.channel('dashboard_updates')
      .on('postgres_changes' as any, { event: 'INSERT', table: 'incident_reports', schema: 'public' }, (payload: any) => {
        setReports(prev => [payload.new, ...prev.slice(0, 4)]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="min-h-screen pl-8 lg:pl-32 pr-4 lg:pr-12 py-8 lg:py-12 space-y-8 lg:space-y-12 relative overflow-hidden bg-zinc-950">
      
      {/* Background Ambience / Depth */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full -ml-32 -mb-32 pointer-events-none" />

      {/* 1. BUSINESS HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-8 lg:gap-0">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="h-[1px] w-12 lg:w-20 bg-primary/40" />
             <span className="text-[10px] text-primary uppercase font-black tracking-[0.5em] animate-pulse">Servicio de Red: Estable</span>
          </div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-5xl lg:text-7xl font-black text-white uppercase tracking-tighter leading-none"
          >
            SPS <span className="text-primary tracking-[-0.05em]">BUSINESS</span>
          </motion.h1>
          <p className="text-gray-500 text-[10px] tracking-[0.3em] font-mono italic uppercase">Business Logistic Platform V.2.0.4</p>
        </div>

        <div className="flex flex-col items-start lg:items-end gap-4 w-full lg:w-auto">
           <div className="flex gap-2 p-1 bg-white/5 backdrop-blur-3xl rounded-xl border border-white/5 shadow-2xl w-full lg:w-auto overflow-x-auto no-scrollbar">
              <Button variant="ghost" className="h-10 px-6 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all whitespace-nowrap">Reporte IA</Button>
              <Link href="/gerente/objetivos/nuevo" className="inline-block">
                <Button variant="tactical" className="h-10 px-8 text-[9px] font-black uppercase tracking-widest haptic-light relative overflow-hidden group whitespace-nowrap">
                   <div className="absolute inset-0 bg-primary group-hover:bg-accent transition-colors" />
                   <span className="relative flex items-center gap-2"><PlusIcon /> Nuevo Objetivo</span>
                </Button>
              </Link>
           </div>
           <div className="text-[8px] text-zinc-600 font-mono flex items-center gap-2 pr-2">
              <Cpu size={10} /> SYS_SYNC_OK :: ONLINE_WORKSPACE
           </div>
        </div>
      </div>

      {/* 2. OPERATIONAL LAYOUT (Responsive Grid) */}
      <div className="grid grid-cols-12 gap-6 lg:gap-8 min-h-[600px] lg:h-[750px] relative">
        
        {/* TOP LEFT: BUSINESS KPIs */}
        <div className="col-span-12 lg:col-span-3 grid lg:grid-cols-1 gap-6 lg:flex lg:flex-col lg:gap-6">
           {[
             { label: 'Facturación Bruta', value: '$12.4M', icon: DollarSign, trend: '+5.2%', color: 'text-green-500', note: 'MTD_REVENUE', href: '/gerente/admin-finanzas' },
             { label: 'Unidades en Puesto', value: activeResCount, icon: Building2, trend: '98%', color: 'text-primary', note: 'STAFF_ENGAGED', href: '/gerente/personal' },
             { label: 'Riesgo Logístico', value: '0.04%', icon: TrendingUp, trend: 'Bajo', color: 'text-blue-500', note: 'COMPLIANCE_RATIO', href: '/gerente/auditoria' },
           ].map((stat, i) => (
             <Link key={i} href={stat.href} className="w-full">
               <motion.div
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ delay: i * 0.1 }}
                 className="p-6 liquid-glass rounded-[2rem] border-white/5 refractive-edge group hover:bg-white/[0.04] hover:border-primary/20 transition-all relative overflow-hidden h-full flex flex-col justify-between cursor-pointer"
               >
                  <div className="space-y-4">
                     <div className="flex justify-between items-start">
                        <div className="p-2 bg-white/5 rounded-xl text-white/40 group-hover:text-primary transition-colors">
                          <stat.icon size={20} />
                        </div>
                        <ArrowUpRight size={14} className="text-zinc-600 group-hover:text-primary transition-colors" />
                     </div>
                     <div>
                        <h3 className={cn("text-3xl lg:text-4xl font-black leading-none tracking-tighter mb-1", stat.color)}>{stat.value}</h3>
                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">{stat.label}</p>
                     </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                     <span className="text-[8px] font-mono text-zinc-600 tracking-tighter uppercase">{stat.note}</span>
                     <span className="text-[9px] font-mono text-zinc-500 flex items-center gap-1">{stat.trend}</span>
                  </div>
               </motion.div>
             </Link>
           ))}
        </div>

        {/* CENTER: OPERATIONS MONITOR (MAP) */}
        <div className="col-span-12 lg:col-span-6 relative group h-[400px] lg:h-full">
           <div className="absolute inset-0 liquid-glass rounded-[2rem] lg:rounded-[3rem] border-primary/20 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] z-0">
              
              {/* MONITOR OVERLAY */}
              <div className="absolute top-4 lg:top-8 left-4 lg:left-8 z-10 space-y-2">
                 <div className="flex items-center gap-4 bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 group">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(255,215,0,0.5)]" />
                    <span className="text-[10px] font-black uppercase text-white tracking-widest">Monitor Global Santa Fe</span>
                 </div>
              </div>

              <div className="absolute inset-0 z-0 opacity-90 transition-transform group-hover:scale-[1.02] duration-1000">
                 <TacticalLeaflet 
                   objectives={objectives} 
                   className="w-full h-full"
                 />
              </div>

              {/* DASHBOARD INFO BARS */}
              <div className="absolute bottom-6 lg:bottom-12 inset-x-6 lg:inset-x-12 z-10 flex justify-between items-end">
                 <div className="space-y-4">
                    <div className="bg-black/60 backdrop-blur-md p-4 rounded-3xl border border-white/10 space-y-1">
                       <p className="text-[8px] text-zinc-400 uppercase font-black tracking-widest">Nodos Conectados</p>
                       <p className="text-xl font-black text-white">{objectives.length} PUESTOS</p>
                    </div>
                    <div className="hidden lg:flex h-10 w-44 bg-primary/10 backdrop-blur-md border border-primary/20 rounded-full items-center justify-around px-4">
                       {[...Array(4)].map((_, i) => (
                         <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_rgba(255,215,0,0.5)]" />
                       ))}
                    </div>
                 </div>

                 <Link href="/gerente/mapa">
                   <Button variant="ghost" className="h-12 w-12 rounded-full bg-black/60 border border-white/10 text-white hover:text-primary hover:border-primary/40 backdrop-blur-xl transition-all">
                      <MapIcon size={20} />
                   </Button>
                 </Link>
              </div>

           </div>
           
           <div className="hidden lg:block absolute -inset-4 border border-white/5 rounded-[4rem] pointer-events-none group-hover:border-primary/5 transition-all duration-700" />
        </div>

        {/* RIGHT: LIVE ACTIVITY FEED */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
           
           <div className="flex-1 liquid-glass rounded-[2rem] border-white/5 overflow-hidden flex flex-col min-h-[400px]">
              <div className="p-8 border-b border-white/10 flex items-center justify-between">
                 <div className="space-y-1">
                    <h4 className="text-[11px] font-black uppercase text-white tracking-[0.2em] flex items-center gap-2">
                      <Target size={14} className="text-primary" /> Actividad Real
                    </h4>
                    <p className="text-[8px] text-zinc-500 font-mono italic">SYSLOG_V2_ONLINE</p>
                 </div>
                 <Button variant="ghost" size="icon" className="text-zinc-600"><MoreVertical size={16} /></Button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                 <AnimatePresence>
                    {reports.map((report, i) => (
                      <motion.div 
                        key={report.id || i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="group relative cursor-pointer"
                      >
                         <div className="p-5 bg-white/5 border border-white/5 rounded-2xl group-hover:bg-primary/5 group-hover:border-primary/20 transition-all">
                            <div className="flex justify-between items-center mb-2">
                               <div className="flex items-center gap-2">
                                  <div className={cn("w-1.5 h-1.5 rounded-full", report.incident_type === 'Emergencia' ? "bg-red-500" : "bg-primary")} />
                                  <span className="text-[9px] font-black uppercase text-white tracking-widest">{report.incident_type || 'Operativo'}</span>
                               </div>
                               <span className="text-[8px] text-zinc-600 font-mono italic uppercase">
                                  {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 group-hover:text-white transition-colors leading-relaxed line-clamp-2">"{report.description}"</p>
                         </div>
                      </motion.div>
                    ))}
                 </AnimatePresence>
                 {reports.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center opacity-10 space-y-4 py-20 text-center">
                      <Activity size={40} />
                      <p className="text-[9px] font-black uppercase tracking-widest">Sin Reportes en Curso</p>
                   </div>
                 )}
              </div>

              <Link href="/gerente/admin-finanzas">
                <div className="p-6 bg-black/60 text-center border-t border-white/10 group cursor-pointer hover:bg-black/80 transition-all">
                   <button className="text-[10px] text-zinc-500 uppercase font-black group-hover:text-primary transition-colors tracking-widest flex items-center justify-center gap-2 w-full">
                      Panel de Administración <ArrowRight size={14} />
                   </button>
                </div>
              </Link>
           </div>

           {/* LOGISTICS CARD */}
           <div className="p-8 bg-primary/5 border border-primary/20 rounded-[2rem] space-y-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                 <Zap size={80} />
              </div>
              <div className="flex justify-between items-center relative z-10">
                 <p className="text-[10px] font-black text-white uppercase tracking-widest">Carga Impositiva AFIP</p>
                 <span className="text-[10px] text-primary font-black animate-pulse">20 MAY</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden relative z-10">
                 <motion.div initial={{ width: 0 }} animate={{ width: '68%' }} transition={{ duration: 1 }} className="h-full bg-primary" />
              </div>
              <p className="text-[8px] text-zinc-600 uppercase font-black text-center tracking-widest relative z-10">Auditoría Fiscal en Curso</p>
           </div>

        </div>

      </div>

    </div>
  );
}

function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
}
