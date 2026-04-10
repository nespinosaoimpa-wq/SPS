'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  MapPin, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  FileText, 
  ChevronLeft, 
  Phone, 
  Mail,
  Briefcase,
  FileBadge,
  Award,
  ArrowRight,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

const TacticalLeaflet = dynamic(() => import('@/components/gerente/TacticalLeaflet'), { ssr: false });

export default function ProfessionalProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/employees/${id}`);
        const data = await res.json();
        setProfile(data);
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading || !profile) {
     return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950">
         <div className="w-12 h-12 border-4 border-white/10 border-t-primary animate-spin rounded-full mb-4" />
         <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] animate-pulse">Sincronizando Base de Datos...</p>
       </div>
     );
  }

  const chartData = profile.performance_data || [];

  return (
    <div className="min-h-screen bg-zinc-950 pl-32 pr-12 py-12 space-y-10 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 blur-[150px] rounded-full -mr-64 -mt-64 pointer-events-none opacity-20" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full -ml-32 -mb-32 pointer-events-none opacity-10" />

      {/* 1. NAVIGATION & ACTIONS */}
      <div className="flex justify-between items-center relative z-10">
        <Link href="/gerente/personal">
          <Button variant="ghost" className="text-zinc-500 hover:text-white gap-2 font-black uppercase text-[10px] tracking-widest transition-all">
            <ChevronLeft size={16} className="text-primary" /> Volver al Personal
          </Button>
        </Link>
        <div className="flex gap-4">
          <Button variant="ghost" size="sm" className="bg-white/5 border border-white/10 text-zinc-400 hover:text-white font-black uppercase text-[9px] tracking-widest rounded-xl px-6">Editar Ficha</Button>
          <Button variant="vanguard" size="sm" className="font-black uppercase text-[9px] tracking-widest shadow-2xl">Descargar Legajo Digital</Button>
        </div>
      </div>

      {/* 2. PROFILE HERO SECTION (Tactical Glassmorphism) */}
      <div className="grid grid-cols-12 gap-8 relative z-10">
        
        {/* PROFILE CARD */}
        <Card className="col-span-4 bg-white/[0.03] backdrop-blur-3xl border-white/5 shadow-2xl overflow-hidden rounded-[2.5rem]">
          <div className="h-40 bg-gradient-to-br from-zinc-900 via-black to-zinc-900 relative">
             <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
             <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-zinc-950 to-transparent" />
          </div>
          <CardContent className="p-8 pt-0 -mt-16 text-center relative z-10">
             <motion.div 
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="w-32 h-32 mx-auto rounded-[2.5rem] bg-zinc-900 border-4 border-zinc-950 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center text-zinc-800 overflow-hidden relative group"
             >
                <User size={64} className="group-hover:text-primary transition-colors" />
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
             </motion.div>
             <h2 className="mt-6 text-3xl font-black text-white leading-none tracking-tighter">{profile.name}</h2>
             <div className="inline-flex items-center gap-2 mt-3 mb-8 bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">
                <ShieldCheck size={12} className="text-primary" />
                <p className="text-[9px] font-black uppercase text-primary tracking-[0.2em]">{profile.role}</p>
             </div>
             
             <div className="grid grid-cols-2 gap-4 py-8 border-y border-white/5">
                <div className="text-left space-y-1 border-r border-white/5 pr-4">
                   <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Identificación</p>
                   <p className="text-xs font-mono font-bold text-white tracking-widest">{profile.id}</p>
                </div>
                <div className="text-left space-y-1 pl-4">
                   <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Alta Operativa</p>
                   <p className="text-xs font-bold text-white">{new Date(profile.hiring_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
             </div>

             <div className="space-y-4 pt-8">
                <div className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl group hover:bg-white/[0.04] transition-all">
                   <Phone size={16} className="text-zinc-500 group-hover:text-primary transition-colors" />
                   <span className="text-xs font-bold text-zinc-400 group-hover:text-white transition-all">{profile.phone || '+54 342 555-0123'}</span>
                </div>
                <div className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl group hover:bg-white/[0.04] transition-all">
                   <Mail size={16} className="text-zinc-500 group-hover:text-primary transition-colors" />
                   <span className="text-xs font-bold text-zinc-400 group-hover:text-white transition-all">{profile.email || 'c.mendez@sps.com'}</span>
                </div>
             </div>
          </CardContent>
        </Card>

        {/* ANALYTICS & LIVE MAP */}
        <div className="col-span-8 flex flex-col gap-8">
           
           {/* PERFORMANCE DATA VIZ */}
           <Card className="bg-white/[0.02] border-white/5 shadow-2xl rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-8 pb-0 flex flex-row items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                       <TrendingUp size={20} />
                    </div>
                    <div>
                       <CardTitle className="text-xs text-white tracking-[0.2em] font-black uppercase">Métricas de Rendimiento</CardTitle>
                       <p className="text-[9px] text-zinc-500 uppercase font-black tracking-tighter italic">Análisis trimestral de horas y efectividad</p>
                    </div>
                 </div>
                 <div className="flex gap-8">
                    <div className="text-right">
                       <p className="text-[8px] font-black text-zinc-500 uppercase mb-1">Total Horas (4M)</p>
                       <p className="text-2xl font-black text-white tracking-tighter">664h</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[8px] font-black text-zinc-500 uppercase mb-1">Puntualidad Avg.</p>
                       <p className="text-2xl font-black text-primary tracking-tighter">98.4%</p>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="p-8 h-[240px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                       <defs>
                          <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#EAB308" stopOpacity={0.3}/>
                             <stop offset="95%" stopColor="#EAB308" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                       <XAxis 
                         dataKey="month" 
                         axisLine={false} 
                         tickLine={false} 
                         tick={{ fill: '#71717a', fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }} 
                         dy={10}
                       />
                       <YAxis hide />
                       <Tooltip 
                         contentStyle={{ backgroundColor: '#09090b', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px', color: '#fff' }}
                         itemStyle={{ color: '#EAB308', fontWeight: 900 }}
                       />
                       <Area type="monotone" dataKey="hours" stroke="#EAB308" strokeWidth={4} fillOpacity={1} fill="url(#colorHours)" />
                    </AreaChart>
                 </ResponsiveContainer>
              </CardContent>
           </Card>

           <div className="grid grid-cols-2 gap-8 flex-1">
              <Card className="bg-white/[0.02] border-white/5 shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col relative">
                <CardHeader className="p-6 border-b border-white/5 flex flex-row items-center justify-between">
                   <div className="flex items-center gap-3">
                      <MapPin size={16} className="text-blue-500" />
                      <span className="text-[10px] text-white tracking-widest font-black uppercase">Ubicación Actual</span>
                   </div>
                   <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[8px] text-green-500 font-black uppercase tracking-widest">Live</span>
                   </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 grayscale invert-[0.9] hover:grayscale-0 hover:invert-0 transition-all duration-700">
                   <TacticalLeaflet 
                     center={[profile.latitude || -31.625, profile.longitude || -60.705]} 
                     resources={[{ id: profile.id, name: profile.name, latitude: profile.latitude || -31.625, longitude: profile.longitude || -60.705, status: 'active' }]}
                     zoom={15}
                   />
                </CardContent>
              </Card>

              <div className="space-y-6">
                 {[
                   { label: 'Jornada Actual', value: '06h 42m', sub: 'Objetivo Portofino', icon: Clock, color: 'text-primary' },
                   { label: 'Equipo Provisto', value: 'Auditado', sub: '9 Unidades de Equipo', icon: Briefcase, color: 'text-white' },
                   { label: 'Riesgo Operativo', value: 'Bajo', sub: 'Sin Alertas Activas', icon: Activity, color: 'text-green-500' },
                 ].map((stat, i) => (
                   <motion.div
                     key={i}
                     initial={{ x: 20, opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                     transition={{ delay: i * 0.1 }}
                     className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl flex items-center gap-6 group hover:bg-white/[0.05] transition-all cursor-default"
                   >
                     <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 group-hover:text-primary transition-all">
                        <stat.icon size={20} />
                     </div>
                     <div>
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{stat.label}</p>
                        <h4 className={cn("text-lg font-black tracking-tighter uppercase leading-none mt-1", stat.color)}>{stat.value}</h4>
                        <p className="text-[9px] text-zinc-600 font-bold mt-1 uppercase italic">{stat.sub}</p>
                     </div>
                   </motion.div>
                 ))}
              </div>
           </div>

        </div>
      </div>

      {/* 3. DOCUMENTATION SYSTEM */}
      <div className="grid grid-cols-12 gap-8 relative z-10">
        
        <div className="col-span-12">
           <div className="flex items-center gap-4 mb-8 pl-4">
              <div className="h-px w-12 bg-white/10" />
              <h3 className="text-xs font-black uppercase text-zinc-500 tracking-[0.4em]">Gestión de Cumplimiento Legal</h3>
           </div>
           
           <div className="grid grid-cols-4 gap-8">
              {[
                { label: 'Examen Psicotécnico', expiry: profile.psych_expiry, icon: FileBadge, status: 'VIGENTE' },
                { label: 'Credencial CLU (Art 18)', expiry: profile.license_expiry, icon: Award, status: 'VIGENTE' },
                { label: 'Curso Capacitación', expiry: profile.training_expiry, icon: FileText, status: 'PRÓXIMO VENC.' },
                { label: 'Carnet Conducir', expiry: '2028-12-14', icon: FileText, status: 'VIGENTE' },
              ].map((doc, i) => (
                <Card key={i} className="bg-white/[0.02] border-white/5 p-8 rounded-[2rem] group hover:bg-white/[0.04] transition-all relative overflow-hidden flex flex-col justify-between h-56 shadow-xl">
                   <div className="flex justify-between items-start">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                        doc.status === 'VIGENTE' ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
                      )}>
                         <doc.icon size={24} />
                      </div>
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md border",
                        doc.status === 'VIGENTE' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                      )}>
                        {doc.status}
                      </span>
                   </div>
                   <div>
                      <h4 className="text-sm font-black text-white uppercase mb-1 tracking-tight">{doc.label}</h4>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-6">Vencimiento: {new Date(doc.expiry).toLocaleDateString('es-AR')}</p>
                      <button className="flex items-center gap-2 text-[9px] font-black text-primary uppercase tracking-widest hover:gap-3 transition-all">
                        Ver Documento Digital <ArrowRight size={12} />
                      </button>
                   </div>
                </Card>
              ))}
           </div>
        </div>

      </div>

    </div>
  );
}
