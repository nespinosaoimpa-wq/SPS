'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Users, 
  Map as MapIcon, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Activity, 
  DollarSign, 
  ArrowUpRight,
  Zap,
  MoreVertical,
  ChevronRight,
  Target,
  Cpu
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

const TacticalLeaflet = dynamic(() => import('@/components/gerente/TacticalLeaflet'), { ssr: false });

export default function CommandMatrix() {
  const [activeResCount, setActiveResCount] = useState(0);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      const { count } = await supabase.from('resources').select('*', { count: 'exact', head: true }).eq('status', 'activo');
      setActiveResCount(count || 0);

      const { data: objData } = await supabase.from('objectives').select('*');
      setObjectives(objData || []);

      const { data: incData } = await supabase.from('incident_reports').select('*').order('created_at', { ascending: false }).limit(5);
      setIncidents(incData || []);
      setLoading(false);
    }
    fetchDashboardData();

    const channel = supabase.channel('dashboard_updates')
      .on('postgres_changes' as any, { event: 'INSERT', table: 'incident_reports', schema: 'public' }, (payload: any) => {
        setIncidents(prev => [payload.new, ...prev.slice(0, 4)]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="min-h-screen pl-32 pr-12 py-12 space-y-12 relative overflow-hidden">
      
      {/* Background Ambience / Depth */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full -ml-32 -mb-32 pointer-events-none" />

      {/* 1. SPECTACULAR HEADER: MISSION STATUS */}
      <div className="flex justify-between items-start">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="h-[1px] w-20 bg-primary/40" />
             <span className="text-[10px] text-primary uppercase font-black tracking-[0.5em] animate-pulse">Operational Status: Optimal</span>
          </div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-7xl font-black text-white uppercase tracking-tighter leading-none"
          >
            SPS <span className="text-primary tracking-[-0.05em]">CORE</span>
          </motion.h1>
          <p className="text-gray-500 text-[10px] tracking-[0.3em] font-mono italic uppercase">Enterprise Command Interface V.2.0.4</p>
        </div>

        <div className="flex flex-col items-end gap-4">
           <div className="flex gap-2 p-1 liquid-glass rounded-xl border-white/5 shadow-2xl">
              <Button variant="ghost" className="h-10 px-6 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all">Relatos de IA</Button>
              <Button variant="tactical" className="h-10 px-8 text-[9px] font-black uppercase tracking-widest haptic-light relative overflow-hidden group">
                 <div className="absolute inset-0 bg-primary group-hover:bg-accent transition-colors" />
                 <span className="relative flex items-center gap-2"><Zap size={14} /> Modo Alerta</span>
              </Button>
           </div>
           <div className="text-[8px] text-zinc-600 font-mono flex items-center gap-2 pr-2">
              <Cpu size={10} /> SYS_BACKBONE_STABLE :: BUFFER_SYNC_OK
           </div>
        </div>
      </div>

      {/* 2. COMMAND MATRIX LAYOUT */}
      <div className="grid grid-cols-12 gap-8 h-[750px] relative">
        
        {/* TOP LEFT: PRIMARY KPIs (SPATIAL DEPTH) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
           {[
             { label: 'Ingresos Operativos', value: '$12.4M', icon: DollarSign, trend: '+5.2%', color: 'text-green-500', note: 'MTD_FORECAST' },
             { label: 'Asset Readiness', value: activeResCount, icon: Shield, trend: '98%', color: 'text-primary', note: 'FIELD_UNITS_ON' },
             { label: 'Risk Integrity', value: '0.04%', icon: Activity, trend: 'Low', color: 'text-blue-500', note: 'THREAT_VECTOR_X' },
           ].map((stat, i) => (
             <motion.div
               key={i}
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: i * 0.1 }}
               className="p-6 liquid-glass rounded-[2rem] border-white/5 refractive-edge group hover:bg-white/[0.02] transition-colors relative overflow-hidden h-full flex flex-col justify-between cursor-default"
             >
                <div className="space-y-4">
                   <div className="flex justify-between items-start">
                      <div className="p-2 bg-white/5 rounded-xl text-white/40 group-hover:text-primary transition-colors">
                        <stat.icon size={20} />
                      </div>
                      <span className="text-[8px] font-mono text-zinc-600 tracking-tighter uppercase">{stat.note}</span>
                   </div>
                   <div>
                      <h3 className={cn("text-4xl font-black leading-none tracking-tighter mb-1", stat.color)}>{stat.value}</h3>
                      <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">{stat.label}</p>
                   </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                   <div className="h-[2px] w-12 bg-white/5 overflow-hidden rounded-full">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: '100%' }} 
                        className={cn("h-full", stat.color.replace('text', 'bg'))}
                        transition={{ duration: 2, delay: i * 0.5 }}
                      />
                   </div>
                   <span className="text-[9px] font-mono text-zinc-500 flex items-center gap-1">{stat.trend} <ArrowUpRight size={10}/></span>
                </div>
             </motion.div>
           ))}
        </div>

        {/* CENTER: THE STRATEGIC NUCLEUS (MAP) */}
        <div className="col-span-12 lg:col-span-6 relative">
           <div className="absolute inset-x-4 inset-y-0 liquid-glass rounded-[3rem] border-primary/20 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] z-0 tactical-scanline">
              
              {/* RADAR OVERLAY ELEMENTS */}
              <div className="absolute top-8 left-8 z-10 space-y-2">
                 <div className="flex items-center gap-4 bg-black/60 backdrop-blur-3xl px-6 py-3 rounded-full border border-white/10 group">
                    <div className="w-3 h-3 rounded-full bg-primary animate-ping" />
                    <span className="text-[10px] font-black uppercase text-white tracking-widest">Geo-Spatial Intelligence Core</span>
                 </div>
                 <div className="flex gap-2">
                    <div className="h-1 w-20 bg-primary/20 rounded-full" />
                    <div className="h-1 w-10 bg-primary/40 rounded-full animate-pulse" />
                 </div>
              </div>

              <div className="absolute inset-0 z-0 opacity-70">
                 <TacticalLeaflet 
                   objectives={objectives} 
                   className="w-full h-full grayscale-[0.3] invert-[0.1]"
                 />
              </div>

              {/* CENTER CIRCULAR HUB UI */}
              <div className="absolute bottom-12 inset-x-12 z-10 flex justify-between items-end">
                 <div className="space-y-4">
                    <div className="bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/5 space-y-1">
                       <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest">Active Objectives</p>
                       <p className="text-xl font-black text-white">{objectives.length} NODES</p>
                    </div>
                    <div className="h-10 w-44 bg-primary/10 backdrop-blur-md border border-primary/20 rounded-full flex items-center justify-around px-4">
                       <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                       <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                       <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                       <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                    </div>
                 </div>

                 <Button variant="ghost" className="h-12 w-12 rounded-full border border-white/10 text-white hover:text-primary backdrop-blur-xl">
                    <MapIcon size={20} />
                 </Button>
              </div>

           </div>
           
           {/* OUTER DECORATIVE RINGS (VANGUARD FEEL) */}
           <div className="absolute -inset-4 border border-white/5 rounded-[4rem] pointer-events-none" />
           <div className="absolute -inset-10 border border-white/[0.02] rounded-[5rem] pointer-events-none" />
        </div>

        {/* RIGHT: LIVE INTELLIGENCE FEED */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
           
           <div className="flex-1 liquid-glass rounded-[2rem] border-white/5 overflow-hidden flex flex-col">
              <div className="p-8 border-b border-white/10 flex items-center justify-between">
                 <div className="space-y-1">
                    <h4 className="text-[11px] font-black uppercase text-white tracking-[0.2em] flex items-center gap-2">
                      <TrendingUp size={14} className="text-primary" /> Event Matrix
                    </h4>
                    <p className="text-[8px] text-zinc-500 font-mono italic">REALTIME_INGEST_V5</p>
                 </div>
                 <Button variant="ghost" size="icon" className="text-zinc-600"><MoreVertical size={16} /></Button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                 <AnimatePresence>
                    {incidents.map((inc, i) => (
                      <motion.div 
                        key={inc.id || i}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="group relative cursor-pointer"
                      >
                         <div className="p-5 bg-white/5 border border-white/5 rounded-2xl group-hover:bg-primary/5 group-hover:border-primary/20 transition-all">
                            <div className="flex justify-between items-center mb-2">
                               <div className="flex items-center gap-2">
                                  <div className={cn("w-1.5 h-1.5 rounded-full", inc.incident_type === 'Emergencia' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]" : "bg-primary")} />
                                  <span className="text-[9px] font-black uppercase text-white tracking-widest">{inc.incident_type || 'Operativo'}</span>
                               </div>
                               <span className="text-[8px] text-zinc-600 font-mono italic">
                                  {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 group-hover:text-white transition-colors leading-relaxed line-clamp-2">"{inc.description}"</p>
                         </div>
                      </motion.div>
                    ))}
                 </AnimatePresence>
                 {incidents.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center opacity-20 italic space-y-4 p-8 text-center">
                      <Shield size={40} />
                      <p className="text-[9px] font-black uppercase tracking-[0.4em]">Tranquilidad Operativa</p>
                   </div>
                 )}
              </div>

              <div className="p-6 bg-black/40 text-center border-t border-white/10 group cursor-pointer">
                 <button className="text-[9px] text-zinc-600 uppercase font-black group-hover:text-primary transition-colors tracking-widest flex items-center justify-center gap-2 w-full">
                    Sincronizar Panel Completo <ChevronRight size={12} />
                 </button>
              </div>
           </div>

           {/* MINI PERFORMANCE HUD */}
           <div className="h-40 liquid-glass rounded-[2rem] border-white/5 p-6 space-y-4">
              <div className="flex justify-between items-center">
                 <p className="text-[10px] font-black text-white uppercase tracking-widest">CPU Sync Integrity</p>
                 <span className="text-[10px] text-primary font-black">100%</span>
              </div>
              <div className="flex items-end gap-1 h-12">
                 {[...Array(12)].map((_, i) => (
                   <motion.div 
                     key={i}
                     initial={{ height: 0 }}
                     animate={{ height: `${20 + Math.random() * 80}%` }}
                     transition={{ repeat: Infinity, repeatType: "mirror", duration: 1 + Math.random() }}
                     className="flex-1 bg-white/10 rounded-full" 
                   />
                 ))}
              </div>
           </div>

        </div>

      </div>

    </div>
  );
}
