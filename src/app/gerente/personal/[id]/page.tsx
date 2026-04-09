'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  MoreHorizontal,
  Briefcase,
  AlertCircle,
  FileBadge,
  Award,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const TacticalLeaflet = dynamic(() => import('@/components/gerente/TacticalLeaflet'), { ssr: false });

export default function ProfessionalProfile({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);

  // Mock Data for the Corporate Profile
  const profile = {
    id: params.id || 'S-701',
    name: 'Carlos Méndez',
    role: 'Vigilante Principal',
    status: 'Activo',
    hiringDate: '12 Ene 2024',
    salary: '$840.000 ARS',
    location: { lat: -31.625, lng: -60.705, address: 'Bv. Pellegrini 2800, Santa Fe' },
    contact: { phone: '+54 342 555-0123', email: 'c.mendez@sps-seguridad.com' },
    docs: {
      psych: { status: 'valid', expiry: '12 Oct 2026', label: 'Psicotécnico' },
      license: { status: 'valid', expiry: '05 Mar 2027', label: 'CLU Art. 18' },
      training: { status: 'warning', expiry: '20 May 2024', label: 'Capacitación' },
    },
    performance: [
      { month: 'Abril', hours: 168, incidents: 0, punctuality: '98%' },
      { month: 'Marzo', hours: 172, incidents: 1, punctuality: '95%' },
    ]
  };

  useEffect(() => {
    setTimeout(() => setLoading(false), 800);
  }, []);

  if (loading) {
     return <div className="min-h-screen flex items-center justify-center bg-zinc-50">
       <div className="w-10 h-10 border-4 border-zinc-200 border-t-primary animate-spin rounded-full" />
     </div>
  }

  return (
    <div className="min-h-screen bg-zinc-50 pl-32 pr-12 py-12 space-y-10">
      
      {/* 1. NAVIGATION & ACTIONS */}
      <div className="flex justify-between items-center">
        <Link href="/gerente/personal">
          <Button variant="ghost" className="text-zinc-500 hover:text-zinc-900 gap-2 font-black uppercase text-[10px]">
            <ChevronLeft size={16} /> Volver al Personal
          </Button>
        </Link>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="bg-white border-zinc-200 text-zinc-600 font-bold uppercase text-[9px]">Editar Ficha</Button>
          <Button variant="vanguard" size="sm" className="font-bold uppercase text-[9px]">Descargar Legajo</Button>
        </div>
      </div>

      {/* 2. PROFILE HERO SECTION (Clean Vanguard) */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* PROFILE CARD */}
        <Card className="col-span-4 bg-white border-zinc-200 shadow-sm overflow-hidden">
          <div className="h-32 bg-zinc-900 relative">
             <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          </div>
          <CardContent className="p-8 pt-0 -mt-12 text-center relative z-10">
             <div className="w-24 h-24 mx-auto rounded-3xl bg-zinc-100 border-4 border-white shadow-xl flex items-center justify-center text-zinc-400 overflow-hidden">
                <User size={48} />
             </div>
             <h2 className="mt-4 text-2xl font-black text-zinc-900 leading-none">{profile.name}</h2>
             <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mt-2 mb-6">{profile.role}</p>
             
             <div className="grid grid-cols-2 gap-4 py-6 border-t border-zinc-50">
                <div className="text-left space-y-1">
                   <p className="text-[8px] font-black text-zinc-400 uppercase">Legajo ID</p>
                   <p className="text-xs font-mono font-bold text-zinc-900">{profile.id}</p>
                </div>
                <div className="text-left space-y-1">
                   <p className="text-[8px] font-black text-zinc-400 uppercase">Ingreso</p>
                   <p className="text-xs font-bold text-zinc-900">{profile.hiringDate}</p>
                </div>
             </div>

             <div className="space-y-3 pt-6 border-t border-zinc-50">
                <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                   <Phone size={14} className="text-zinc-400" />
                   <span className="text-xs font-medium text-zinc-700">{profile.contact.phone}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                   <Mail size={14} className="text-zinc-400" />
                   <span className="text-xs font-medium text-zinc-700">{profile.contact.email}</span>
                </div>
             </div>
          </CardContent>
        </Card>

        {/* OPERATIONAL STATUS & LIVE MAP */}
        <div className="col-span-8 flex flex-col gap-6">
           <div className="grid grid-cols-3 gap-6">
              {[
                { label: 'Estado Actual', value: 'En Servicio', sub: 'Objetivo Portofino', icon: ShieldCheck, color: 'text-green-600' },
                { label: 'Jornada', value: '06h 42m', sub: 'Faltan 01h 18m', icon: Clock, color: 'text-blue-600' },
                { label: 'Equipo', value: 'Confirmado', sub: 'Radio + Uniforme', icon: Briefcase, color: 'text-zinc-900' },
              ].map((stat, i) => (
                <Card key={i} className="bg-white border-zinc-200 shadow-sm">
                   <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400">
                         <stat.icon size={20} />
                      </div>
                      <div>
                         <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{stat.label}</p>
                         <h4 className={cn("text-sm font-black uppercase", stat.color)}>{stat.value}</h4>
                         <p className="text-[9px] text-zinc-500 italic mt-0.5">{stat.sub}</p>
                      </div>
                   </CardContent>
                </Card>
              ))}
           </div>

           <Card className="flex-1 bg-white border-zinc-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
              <CardHeader className="bg-zinc-50 border-b border-zinc-100 flex flex-row items-center justify-between px-8 py-4">
                 <div className="flex items-center gap-3">
                    <MapPin size={18} className="text-blue-600" />
                    <div>
                       <CardTitle className="text-xs text-zinc-900 tracking-widest font-black uppercase">Última Ubicación Detectada</CardTitle>
                       <p className="text-[9px] text-zinc-400 uppercase font-bold italic tracking-tighter">Sincronización GPS en tiempo real</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-100">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[8px] text-green-700 font-black uppercase">Señal Activa</span>
                 </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 relative">
                 <TacticalLeaflet 
                   center={[profile.location.lat, profile.location.lng]} 
                   resources={[{ id: profile.id, name: profile.name, latitude: profile.location.lat, longitude: profile.location.lng, status: 'active' }]}
                   zoom={16}
                 />
                 <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 backdrop-blur-md p-4 rounded-xl border border-zinc-200 shadow-xl max-w-xs">
                    <p className="text-[9px] font-black text-zinc-400 uppercase mb-1 tracking-widest">Dirección de Servicio</p>
                    <p className="text-xs font-bold text-zinc-900 leading-snug">{profile.location.address}</p>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>

      {/* 3. DOCUMENTATION & ANALYTICS */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* DOCUMENT RADAR */}
        <div className="col-span-5 space-y-6">
           <h3 className="text-xs font-black uppercase text-zinc-500 tracking-[0.3em] pl-2">Repositorio Documental</h3>
           <Card className="bg-white border-zinc-200 shadow-sm">
              <CardContent className="p-0">
                 {Object.entries(profile.docs).map(([key, doc], i) => (
                   <div key={key} className={cn(
                     "flex items-center justify-between p-6 transition-all group hover:bg-zinc-50",
                     i !== 2 && "border-b border-zinc-100"
                   )}>
                      <div className="flex items-center gap-4">
                         <div className={cn(
                           "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                           doc.status === 'valid' ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                         )}>
                            {key === 'psych' ? <FileBadge size={20} /> : key === 'license' ? <Award size={20} /> : <FileText size={20} />}
                         </div>
                         <div>
                            <p className="text-sm font-black text-zinc-900 uppercase">{doc.label}</p>
                            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Vence: {doc.expiry}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-4">
                         <span className={cn(
                           "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded",
                           doc.status === 'valid' ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                         )}>
                           {doc.status === 'valid' ? 'VIGENTE' : 'PRÓXIMO VENC.'}
                         </span>
                         <Button variant="ghost" size="icon" className="text-zinc-300 hover:text-zinc-600">
                            <ArrowRight size={16} />
                         </Button>
                      </div>
                   </div>
                 ))}
              </CardContent>
           </Card>
        </div>

        {/* PERFORMANCE HISTORY */}
        <div className="col-span-7 space-y-6">
           <h3 className="text-xs font-black uppercase text-zinc-500 tracking-[0.3em] pl-2">Registro de Actuaciones y Horas</h3>
           <Card className="bg-white border-zinc-200 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                 <thead className="bg-zinc-50 border-b border-zinc-200">
                    <tr>
                       <th className="p-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-8">Período</th>
                       <th className="p-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Horas Trabajadas</th>
                       <th className="p-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Incidencias</th>
                       <th className="p-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Puntualidad</th>
                    </tr>
                 </thead>
                 <tbody>
                    {profile.performance.map((perf, i) => (
                      <tr key={i} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                         <td className="p-4 pl-8">
                            <div className="flex items-center gap-2">
                               <Calendar size={14} className="text-zinc-300" />
                               <span className="text-xs font-bold text-zinc-900 uppercase">{perf.month} 2024</span>
                            </div>
                         </td>
                         <td className="p-4">
                            <span className="text-xs font-mono font-bold text-zinc-900">{perf.hours} <span className="text-[10px] text-zinc-400 italic font-medium tracking-tight">Hrs / 168</span></span>
                         </td>
                         <td className="p-4">
                            <div className="flex items-center gap-2">
                               <div className={cn("w-2 h-2 rounded-full", perf.incidents > 0 ? "bg-amber-500" : "bg-green-500")} />
                               <span className="text-xs font-medium text-zinc-700">{perf.incidents} Registradas</span>
                            </div>
                         </td>
                         <td className="p-4">
                            <span className="text-xs font-mono font-bold text-primary">{perf.punctuality}</span>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
              <div className="p-4 bg-zinc-50/50 text-center">
                 <button className="text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-zinc-900 transition-colors">Ver Historial Completo de Marcaciones</button>
              </div>
           </Card>
        </div>

      </div>

    </div>
  );
}
