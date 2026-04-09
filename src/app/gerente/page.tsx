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
  ArrowRight,
  Activity,
  Plus as PlusIcon,
  ShieldCheck as ShieldIcon
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex flex-col gap-10">
      
      {/* 1. BRAND & PRIMARY ACTIONS */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
             <div className="h-[1px] w-12 bg-primary/40" />
             <span className="text-[10px] text-primary uppercase font-black tracking-[0.5em] animate-pulse">SISTEMA ONLINE</span>
          </div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-none"
          >
            SPS <span className="text-primary">BUSINESS</span>
          </motion.h1>
          <div className="flex items-center gap-4 text-gray-600 text-[10px] tracking-widest font-black">
             <span>V.2.0.4</span>
             <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
             <span>LATAM_SOUTH_NODES</span>
          </div>
        </div>

        <div className="flex gap-2 p-1 bg-white/5 backdrop-blur-3xl rounded-xl border border-white/5 shadow-2xl w-full lg:w-auto overflow-x-auto no-scrollbar">
          <Button variant="ghost" className="h-10 px-6 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all whitespace-nowrap">Historial</Button>
          <Link href="/gerente/objetivos/nuevo" className="inline-block">
            <Button variant="tactical" className="h-10 px-8 text-[9px] font-black uppercase tracking-widest haptic-light relative overflow-hidden group whitespace-nowrap">
              <div className="absolute inset-0 bg-primary group-hover:bg-accent transition-colors" />
              <span className="relative flex items-center gap-2 text-black"><PlusIcon size={14} /> Registrar Punto</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. MAP HERO (NOW AT THE TOP) */}
      <div className="relative group">
         <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative h-[500px] lg:h-[700px] bg-zinc-900 rounded-[3rem] border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] group"
         >
            <div className="absolute inset-0 z-0">
               <TacticalLeaflet objectives={objectives} resources={[]} />
            </div>
            
            {/* HUD Overlay Elements */}
            <div className="absolute top-8 left-8 z-10 p-5 bg-zinc-950/90 backdrop-blur-2xl border border-white/5 rounded-2xl flex items-center gap-4 pointer-events-none">
               <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_12px_rgba(220,38,38,0.6)]" />
               <div>
                  <h3 className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Vigilancia en Tiempo Real</h3>
                  <p className="text-[7px] text-gray-500 font-mono mt-1">NODO_CENTRAL_CONECTADO</p>
               </div>
            </div>

            <div className="absolute top-8 right-8 z-10 hidden lg:flex gap-2">
               <div className="px-4 py-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl text-[9px] font-mono text-primary flex items-center gap-3">
                  <Activity size={12} /> -31.6333 / -60.7000
               </div>
            </div>

            <div className="absolute bottom-10 inset-x-0 mx-auto w-fit z-10 flex gap-4">
               <Link href="/gerente/mapa">
                 <Button variant="tactical" className="bg-primary text-black h-12 px-10 text-[10px] font-black shadow-[0_10px_30px_rgba(244,180,0,0.3)]">
                    MAXIMIZAR COMANDO TÁCTICO
                 </Button>
               </Link>
            </div>
         </motion.div>
      </div>

      {/* 3. STATS & ANALYTICS MATRIX */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
        {[
          { label: 'Unidades Activas', value: activeResCount, icon: Zap, color: 'text-primary' },
          { label: 'Puntos de Control', value: objectives.length, icon: Building2, color: 'text-green-500' },
          { label: 'Incidentes Hoy', value: reports.length, icon: FileText, color: 'text-red-500' },
          { label: 'Disponibilidad', value: '99.9%', icon: Cpu, color: 'text-blue-500' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            className="p-6 bg-zinc-900 rounded-3xl border border-white/5 hover:border-primary/20 transition-all group overflow-hidden relative shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-[40px] rounded-full translate-x-12 -translate-y-12 pointer-events-none group-hover:bg-primary/10 transition-colors" />
            <div className="flex justify-between items-center mb-6">
               <div className={cn("p-2.5 rounded-xl bg-white/5", stat.color)}>
                  <stat.icon size={20} />
               </div>
               <ArrowUpRight size={14} className="text-gray-700 group-hover:text-primary transition-colors" />
            </div>
            <div>
               <h4 className="text-4xl font-black text-white tracking-tighter">{stat.value}</h4>
               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 4. FEED & ALERTS SECTION */}
      <div className="grid lg:grid-cols-3 gap-8 pb-12">
        <div className="lg:col-span-2 p-8 bg-zinc-900 rounded-[2.5rem] border border-white/5 shadow-2xl">
           <div className="flex items-center justify-between mb-8">
              <h2 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-3">
                 <Activity size={16} className="text-primary" />
                 Stream de Operaciones
              </h2>
              <Button variant="ghost" size="sm" className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Filtrar</Button>
           </div>
           
           <div className="space-y-4">
              {reports.length > 0 ? reports.map((report, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer">
                   <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <ShieldIcon size={20} />
                   </div>
                   <div className="flex-1">
                      <div className="flex justify-between">
                         <h5 className="text-[11px] font-black text-white uppercase">{report.type || 'ALERTA TÁCTICA'}</h5>
                         <span className="text-[8px] font-mono text-gray-600">{new Date(report.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">{report.title}</p>
                   </div>
                </div>
              )) : (
                <p className="text-[10px] text-gray-700 italic text-center py-10 uppercase tracking-widest">Sin incidentes críticos reportados</p>
              )}
           </div>
        </div>

        <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[60px] rounded-full -mr-16 -mt-16" />
           <h2 className="text-sm font-black text-white tracking-widest uppercase mb-4">Estado del Servidor</h2>
           <div className="space-y-6 mt-8">
              <div className="flex items-center justify-between">
                 <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Carga CPU</span>
                 <span className="text-[10px] font-mono text-primary">12%</span>
              </div>
              <div className="w-full h-[2px] bg-white/5 relative">
                 <div className="absolute top-0 left-0 h-full w-[12%] bg-primary" />
              </div>
              <div className="flex items-center justify-between">
                 <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tráfico de Red</span>
                 <span className="text-[10px] font-mono text-green-500">Normal</span>
              </div>
           </div>
           <Button variant="tactical" className="w-full mt-10 text-[9px] h-10 border-primary/20 bg-primary/10 text-primary">REPORTE SISTEMA</Button>
        </div>
      </div>
    </div>
  );
}
