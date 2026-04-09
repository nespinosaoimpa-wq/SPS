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
  Plus as PlusIcon
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
    <div className="space-y-8 lg:space-y-12 relative">
      
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
        </div>
      </div>

      {/* 2. CORE STATS MATRIX */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {[
          { label: 'Unidades Activas', value: activeResCount, icon: Zap, color: 'text-primary' },
          { label: 'Objetivos Protegidos', value: objectives.length, icon: ShieldCheck, color: 'text-green-500' },
          { label: 'Reportes Hoy', value: reports.length, icon: FileText, color: 'text-blue-500' },
          { label: 'Eficiencia Op', value: '98.4%', icon: TrendingUp, color: 'text-primary' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group relative"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-transparent rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="relative p-6 bg-zinc-900 shadow-2xl rounded-2xl border border-white/5 flex flex-col gap-4">
               <div className="flex justify-between items-center">
                 <div className={cn("p-2 rounded-lg bg-white/5", stat.color)}>
                   <stat.icon size={18} />
                 </div>
                 <div className="text-gray-600"><MoreVertical size={14} /></div>
               </div>
               <div>
                  <h3 className="text-3xl font-black text-white">{stat.value}</h3>
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black mt-1">{stat.label}</p>
               </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 3. TACTICAL VIEWS */}
      <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* Real-time Map Feed */}
        <div className="lg:col-span-8 flex flex-col gap-6">
           <div className="relative h-[400px] lg:h-[600px] bg-zinc-900 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl group">
              <div className="absolute inset-0 z-0">
                <TacticalLeaflet objectives={objectives} resources={[]} />
              </div>
              <div className="absolute top-8 left-8 z-10 p-4 bg-zinc-950/80 backdrop-blur-xl border border-white/5 rounded-2xl flex items-center gap-4">
                 <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                 <span className="text-[10px] font-black text-white uppercase tracking-widest">LIVE_OPERATIONAL_FEED</span>
              </div>
              <div className="absolute bottom-8 right-8 z-10 flex gap-4">
                 <Link href="/gerente/mapa">
                   <Button variant="tactical" className="bg-primary text-black h-12 px-8 text-[10px]">MAXIMIZAR MAPA</Button>
                 </Link>
              </div>
           </div>
        </div>

        {/* Live Event Stream */}
        <div className="lg:col-span-4 flex flex-col gap-6">
           <div className="p-8 bg-zinc-900 rounded-[2.5rem] border border-white/5 shadow-2xl h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                 <h2 className="text-sm font-black text-white tracking-widest uppercase">Últimos Reportes</h2>
                 <Button variant="ghost" size="icon" className="text-gray-500"><ChevronRight size={16} /></Button>
              </div>
              
              <div className="space-y-6 flex-1">
                 {reports.map((report, i) => (
                   <motion.div
                     key={i}
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: i * 0.1 }}
                     className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group"
                   >
                     <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                       <ShieldCheck size={18} />
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-[10px] font-black text-white uppercase truncate">{report.type || 'Incidente de Seguridad'}</h4>
                          <span className="text-[8px] text-gray-500 font-mono italic">
                            {new Date(report.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-[9px] text-gray-400 line-clamp-1 leading-relaxed">{report.title}</p>
                     </div>
                   </motion.div>
                 ))}
              </div>

              <Button variant="ghost" className="w-full mt-6 text-[9px] font-black uppercase tracking-widest text-primary/60 hover:text-primary">
                 Descargar Log Completo <ArrowRight size={12} className="ml-2" />
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
}

// Re-importing ShieldCheck since it's used in the JSX but wasn't in the initial imports
function ShieldCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
