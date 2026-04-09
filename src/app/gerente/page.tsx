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
  ShieldCheck,
  Zap,
  MoreVertical,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

const TacticalLeaflet = dynamic(() => import('@/components/gerente/TacticalLeaflet'), { ssr: false });

export default function CEOCommandHub() {
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

    // Realtime subscription for incidents
    const channel = supabase.channel('dashboard_updates')
      .on('postgres_changes' as any, { event: 'INSERT', table: 'incident_reports', schema: 'public' }, (payload: any) => {
        setIncidents(prev => [payload.new, ...prev.slice(0, 4)]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="space-y-6 pb-12">
      
      {/* CEO Level Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none mb-2">Central de Operaciones Corporativa</h1>
          <div className="flex items-center gap-4 text-[10px] text-primary uppercase font-display tracking-[0.3em] italic">
             <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> SISTEMA INTEGRADO V.1.5
             </div>
             <span>SPS SECURITY & INTEL GROUP</span>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="h-10 border-white/10 text-[9px] tracking-widest uppercase">Reporte General PDF</Button>
           <Button variant="tactical" className="h-10 text-[9px] tracking-widest uppercase font-black"><Zap size={14} className="mr-2" /> Modo Alerta</Button>
        </div>
      </div>

      {/* Corporate Health HUD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Facturación Prevista', value: '$12.4M', icon: DollarSign, trend: '+5.2%', color: 'text-green-500' },
          { label: 'Efectivos en Campo', value: activeResCount, icon: Users, trend: '98%', color: 'text-primary' },
          { label: 'Disponibilidad Activos', value: '84%', icon: Activity, trend: 'Estable', color: 'text-blue-500' },
          { label: 'Incidentes Críticos', value: incidents.length, icon: AlertTriangle, trend: 'Ver Detalle', color: 'text-red-500' },
        ].map((stat, i) => (
          <Card key={i} className="bg-secondary/40 border-white/5 hover:border-primary/20 transition-all group cursor-default relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <stat.icon size={50} />
             </div>
             <CardContent className="p-6">
                <p className="text-[9px] uppercase text-gray-500 tracking-widest mb-1 font-display font-black">{stat.label}</p>
                <div className="flex items-end justify-between">
                   <h3 className={cn("text-2xl font-black leading-none", stat.color)}>{stat.value}</h3>
                   <span className="text-[8px] font-mono text-gray-500 uppercase tracking-tighter">{stat.trend}</span>
                </div>
             </CardContent>
          </Card>
        ))}
      </div>

      {/* Strategic Operational Split */}
      <div className="grid grid-cols-12 gap-6 h-[550px]">
        
        {/* Left: Strategic Tactical Map (8 cols) */}
        <div className="col-span-12 lg:col-span-8 relative">
           <Card className="h-full border-primary/10 overflow-hidden bg-black/40 group relative">
              <div className="absolute top-4 left-4 z-10">
                 <div className="bg-black/80 backdrop-blur-md border border-primary/40 px-3 py-1.5 flex items-center gap-2 rounded-xs">
                    <MapIcon size={12} className="text-primary" />
                    <span className="text-[9px] font-black uppercase text-white tracking-widest">Mapa Operativo en Tiempo Real</span>
                 </div>
              </div>
              
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                 <button className="h-8 px-3 bg-zinc-900 border border-white/10 text-[8px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors">Filtros</button>
                 <button className="h-8 px-3 bg-zinc-900 border border-white/10 text-[8px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors">Expandir</button>
              </div>

              <div className="absolute inset-0 z-0">
                 <TacticalLeaflet 
                   objectives={objectives} 
                   className="w-full h-full grayscale-[0.4] invert-[0.1]"
                 />
              </div>

              {/* HUD Accents */}
              <div className="absolute inset-0 pointer-events-none border border-primary/5 rounded-lg" />
              <div className="absolute bottom-6 left-6 z-10">
                 <div className="flex flex-col gap-1">
                    <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-1">Status Global de Cuidado</p>
                    <div className="flex gap-0.5">
                       {[...Array(12)].map((_, i) => (
                         <div key={i} className="w-4 h-1.5 bg-green-500/80 rounded-xs shadow-[0_0_5px_rgba(34,197,94,0.4)]" />
                       ))}
                    </div>
                 </div>
              </div>
           </Card>
        </div>

        {/* Right: Intelligence & Novedades Feed (4 cols) */}
        <div className="col-span-12 lg:col-span-4 h-full flex flex-col gap-6">
           
           {/* Intelligence Feed */}
           <Card className="flex-1 bg-black/40 border-white/10 flex flex-col overflow-hidden">
              <div className="p-4 bg-zinc-900/80 border-b border-white/10 flex items-center justify-between">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                   <TrendingUp size={14} className="text-primary" /> Inteligencia Reciente
                 </h4>
                 <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500"><MoreVertical size={14} /></Button>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                 <AnimatePresence>
                    {incidents.map((inc, i) => (
                      <motion.div 
                        key={inc.id || i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-4 hover:bg-white/5 transition-all group cursor-pointer"
                      >
                         <div className="flex justify-between items-start mb-2">
                            <span className={cn(
                              "text-[8px] font-black px-1.5 py-0.5 uppercase tracking-widest border",
                              inc.incident_type === 'Emergencia' ? "border-red-500 text-red-500 bg-red-500/5 shadow-[0_0_8px_rgba(239,68,68,0.1)]" : "border-primary/40 text-primary bg-primary/5"
                            )}>
                               {inc.incident_type || 'Operativo'}
                            </span>
                            <span className="text-[8px] text-gray-600 font-mono italic">
                               {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                         </div>
                         <p className="text-xs font-bold text-white group-hover:text-primary transition-colors mb-1">{inc.objective_id?.split('-')[0] || 'OBJETO_DELTA'}</p>
                         <p className="text-[10px] text-gray-500 leading-snug line-clamp-2 italic font-mono">"{inc.description}"</p>
                      </motion.div>
                    ))}
                 </AnimatePresence>
              </div>
              <div className="p-4 bg-zinc-900/30 text-center border-t border-white/5">
                 <button className="text-[9px] text-gray-500 uppercase font-black hover:text-primary transition-colors tracking-widest">Ver Todos los Eventos <ChevronRight size={10} className="inline ml-1" /></button>
              </div>
           </Card>

           {/* Resource Availability Quick-Audit */}
           <Card className="bg-primary/5 border-primary/20 p-5">
              <div className="flex justify-between items-center mb-4">
                 <div>
                    <h4 className="text-[10px] font-black uppercase text-white tracking-widest">Estado del Parque Automotor</h4>
                    <p className="text-[8px] text-primary uppercase italic">Mantenimiento y Disponibilidad</p>
                 </div>
                 <div className="text-right">
                    <p className="text-xl font-black text-white">88%</p>
                 </div>
              </div>
              <div className="flex gap-1">
                 {[...Array(15)].map((_, i) => (
                   <div key={i} className={cn("flex-1 h-2 rounded-xs", i < 13 ? "bg-primary" : "bg-white/10")} />
                 ))}
              </div>
              <div className="mt-4 flex justify-between items-center">
                 <span className="text-[8px] text-gray-500 uppercase font-mono tracking-tighter">12 Unidades Operativas</span>
                 <Button variant="ghost" size="icon" className="h-6 w-6 text-primary"><ArrowUpRight size={14} /></Button>
              </div>
           </Card>

        </div>
      </div>

    </div>
  );
}
