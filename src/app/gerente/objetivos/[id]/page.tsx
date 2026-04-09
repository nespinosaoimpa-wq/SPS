'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import { 
  Users, 
  AlertTriangle, 
  ChevronLeft,
  Clock,
  Shield,
  Calendar,
  DollarSign,
  Briefcase,
  ExternalLink,
  Target,
  FileText,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

const TacticalLeaflet = dynamic(() => import('@/components/gerente/TacticalLeaflet'), { ssr: false });

export default function ObjectiveDetail() {
  const { id } = useParams();
  const [objective, setObjective] = useState<any>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: obj } = await supabase.from('objectives').select('*').eq('id', id).single();
        setObjective(obj);

        const { data: shiftData } = await supabase
          .from('guard_shifts')
          .select('*, resources(name)')
          .eq('objective_id', id)
          .order('checkin_time', { ascending: false })
          .limit(10);
        setShifts(shiftData || []);

        const { data: incData } = await supabase
          .from('incident_reports')
          .select('*')
          .eq('objective_id', id)
          .order('created_at', { ascending: false })
          .limit(5);
        setIncidents(incData || []);

        const { data: resData } = await supabase.from('resources').select('*').eq('current_objective_id', id);
        setResources(resData || []);

      } catch (error) {
        console.error('Error fetching objective details:', error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-screen bg-[#050505] text-primary font-black uppercase tracking-widest animate-pulse">Sincronizando Nodo...</div>;
  if (!objective) return <div className="flex items-center justify-center h-screen bg-[#050505] text-red-500 font-bold">Error: Nodo no localizado.</div>;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Upper Command Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/gerente">
            <Button variant="outline" size="icon" className="h-12 w-12 border-white/10 hover:border-primary/40 bg-black/40">
              <ChevronLeft size={24} className="text-primary" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
               <span className="text-[10px] bg-primary/20 text-primary border border-primary/40 px-2 py-0.5 font-black uppercase tracking-widest">Activo Seleccionado</span>
               <span className="text-[10px] text-gray-600 font-mono italic">ID_{objective.id.split('-')[0]}</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase leading-none">{objective.name}</h1>
            <p className="text-gray-500 uppercase text-[10px] tracking-[0.3em] mt-1 font-display flex items-center gap-2">
               <Target size={12} className="text-red-500" /> {objective.address}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-white/10 text-[9px] h-10 tracking-widest uppercase"><FileText size={14} className="mr-2" /> Contrato</Button>
          <Button variant="tactical" className="h-10 text-[9px] tracking-widest uppercase">Gestionar Roster</Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* Left Column: Business & Stats (4 cols) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          {/* Rentabilidad HUD */}
          <Card className="bg-primary/5 border-primary/20 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <DollarSign size={80} />
            </div>
            <CardHeader className="pb-2">
               <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Briefcase size={12} /> Desempeño Financiero
               </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div>
                  <div className="flex justify-between items-end mb-1">
                     <span className="text-[10px] text-gray-500 uppercase font-black">Eficiencia de Horas</span>
                     <span className="text-xl font-black text-white">92%</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                     <motion.div initial={{ width: 0 }} animate={{ width: '92%' }} className="h-full bg-primary" />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-3 bg-black/40 border border-white/5 rounded-sm">
                     <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-1">Margen Op.</p>
                     <p className="text-lg font-black text-green-500">+18.5%</p>
                  </div>
                  <div className="p-3 bg-black/40 border border-white/5 rounded-sm">
                     <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-1">Riesgo Mora</p>
                     <p className="text-lg font-black text-white">Bajo</p>
                  </div>
               </div>
            </CardContent>
          </Card>

          {/* Roster de Personal */}
          <Card className="bg-black/40 border-white/10 overflow-hidden">
            <CardHeader className="bg-zinc-900/50 border-b border-white/5">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                <Users size={14} className="text-primary" /> Personal Asignado al Puesto
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                {resources.length > 0 ? resources.map((res: any) => (
                  <div key={res.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-bold text-primary group-hover:scale-110 transition-transform">
                        {res.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white uppercase">{res.name}</p>
                        <p className="text-[9px] text-gray-600 font-mono tracking-tighter uppercase">{res.role || 'Vigilante'}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                       <div className="w-4 h-4 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center"><Clock size={8} className="text-green-500" /></div>
                       <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-700 hover:text-white"><ExternalLink size={12} /></Button>
                    </div>
                  </div>
                )) : (
                  <div className="p-12 text-center text-[10px] text-gray-600 uppercase tracking-widest italic font-mono">Sin despliegue activo</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center/Right: Map & Operations (8 cols) */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* Tactical Map View */}
          <Card className="h-[450px] overflow-hidden border-primary/10 relative group bg-black">
             <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <div className="bg-black/80 backdrop-blur-md border border-primary/30 px-3 py-1 rounded-sm flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-primary">Live Asset Tracking</span>
                </div>
             </div>
             <TacticalLeaflet 
               objectives={[objective]} 
               center={[objective.latitude, objective.longitude]}
               zoom={16}
               className="h-full grayscale-[0.5] invert-[0.1]"
             />
             {/* Map Scanline Overlay */}
             <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,215,0,0.03)_1px,transparent_1px)] bg-[size:100%_4px] opacity-20" />
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Historial de Turnos / Auditoría rápida */}
            <Card className="border-white/10 bg-black/40">
              <CardHeader className="py-4 border-b border-white/5">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                  <Clock size={14} className="text-primary" /> Turnos de la Jornada
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {shifts.map((shift: any) => (
                  <div key={shift.id} className="p-4 border-b border-white/5 flex justify-between items-center hover:bg-white/5 transition-colors group">
                    <div>
                      <p className="text-xs text-white font-bold group-hover:text-primary transition-colors uppercase">{shift.resources?.name || 'Recurso S-901'}</p>
                      <p className="text-[9px] text-gray-600 flex items-center gap-1 font-mono">
                        <Calendar size={10} /> {new Date(shift.checkin_time).toLocaleDateString()} — {new Date(shift.checkin_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] font-mono font-black text-primary">{shift.duration_hours?.toFixed(1) || '0.0'}h</span>
                       <ChevronRight size={14} className="text-gray-800" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Panel de Novedades Críticas */}
            <Card className="border-red-500/10 bg-red-500/5">
              <CardHeader className="py-4 border-b border-red-500/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
                  <AlertTriangle size={14} /> Reportes de Incidencia
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {incidents.length > 0 ? incidents.map((inc: any) => (
                  <div key={inc.id} className="p-4 border-b border-red-500/10 last:border-0">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[8px] font-black px-2 py-0.5 bg-red-500 text-black uppercase tracking-[0.2em]">{inc.incident_type}</span>
                       <span className="text-[9px] text-red-500/70 font-mono">{new Date(inc.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed font-mono italic">"{inc.description}"</p>
                  </div>
                )) : (
                  <div className="p-12 text-center">
                     <Shield className="w-8 h-8 text-gray-800 mx-auto mb-2" />
                     <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest">Estado: Normalidad Operativa</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
