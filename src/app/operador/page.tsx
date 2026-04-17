'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Clock, MapPin, AlertCircle, 
  User, ChevronRight, LogIn, LogOut, Building2,
  Calendar, ShieldCheck, Activity, Map as MapIcon
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import Link from 'next/link';

import { useShift } from '@/components/providers/ShiftProvider';
import { supabase } from '@/lib/supabase';

export default function GuardiaDashboard() {
  const { isShiftActive, shiftId, shiftData } = useShift();
  const [loading, setLoading] = useState(true);
  const [assignedObjective, setAssignedObjective] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const OPERATOR_ID = 'recurso_demo';

  useEffect(() => {
    const fetchObjective = async () => {
      try {
        const { data: res } = await supabase
          .from('resources')
          .select('*, objectives(*)')
          .eq('id', OPERATOR_ID)
          .single();
        if (res?.objectives) setAssignedObjective(res.objectives);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchObjective();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getElapsedTime = () => {
    if (!shiftData?.startTime) return '00:00:00';
    const start = new Date(shiftData.startTime);
    const diff = currentTime.getTime() - start.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      
      {/* Top Banner / Hero */}
      <div className="bg-gray-900 text-white p-6 pb-20 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 max-w-md mx-auto space-y-6">
           <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
                 <ShieldCheck size={14} className="text-primary" />
                 <span className="text-[10px] font-black uppercase tracking-tight text-primary">SPS Guard OS</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/20 backdrop-blur-md rounded-full border border-green-500/20">
                 <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                 <span className="text-[10px] font-black uppercase text-green-400">Sistema Online</span>
              </div>
           </div>

           <div>
              <p className="text-gray-400 font-medium text-sm">Buen día, Operador</p>
              <h1 className="text-3xl font-black tracking-tight leading-tight mt-1 uppercase italic">
                {isShiftActive ? "En Servicio" : "Listo para Iniciar"}
              </h1>
           </div>
        </div>
      </div>

      {/* Overlapping Content */}
      <div className="max-w-md mx-auto px-6 -mt-12 space-y-6 relative z-20">
        
        {/* Status Card */}
        <Card className="p-0 border-none shadow-2xl shadow-gray-200 overflow-hidden bg-white">
           <div className={cn(
             "px-6 py-8 text-center bg-gradient-to-b",
             isShiftActive ? "from-green-50 to-white" : "from-gray-50 to-white"
           )}>
              <div className="mb-4 inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-xl border border-gray-100">
                {isShiftActive ? (
                  <Activity size={32} className="text-green-500 animate-pulse" />
                ) : (
                  <LogOut size={32} className="text-gray-300" />
                )}
              </div>
              
              {isShiftActive ? (
                <>
                  <p className="text-4xl font-mono font-black text-gray-900 tracking-tighter">
                    {getElapsedTime()}
                  </p>
                  <p className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em] mt-2">Tiempo Transcurrido</p>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold text-gray-900">Sin Turno Activo</p>
                  <p className="text-xs text-gray-400 mt-1">Debes fichar entrada para comenzar</p>
                </>
              )}
           </div>

           <div className="p-4 bg-gray-50/50 flex gap-3 border-t border-gray-100">
              <Link href="/operador/fichaje" className="flex-1">
                <Button variant={isShiftActive ? "danger" : "success"} className="w-full h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg">
                   {isShiftActive ? "Finalizar Turno" : "Fichar Entrada"}
                </Button>
              </Link>
           </div>
        </Card>

        {/* Assigned Objective Section */}
        <div className="space-y-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Puesto de Servicio</p>
          <Card className="p-5 border-none shadow-xl shadow-gray-200/50 bg-white">
             <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center border border-gray-800 shadow-lg">
                   <Building2 size={24} className={cn(assignedObjective ? "text-primary" : "text-gray-600")} />
                </div>
                <div className="flex-1 min-w-0">
                   <h3 className="text-sm font-black text-gray-900 uppercase truncate">
                     {assignedObjective?.name || 'Esperando Asignación'}
                   </h3>
                   <div className="flex items-center gap-1.5 mt-1">
                      <MapPin size={12} className="text-gray-400" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase truncate">
                        {assignedObjective?.address || 'Pendiente de Confirmación'}
                      </p>
                   </div>
                </div>
                <Link href="/operador/fichaje">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 hover:bg-primary/10 transition-colors">
                     <MapIcon size={18} className="text-gray-400" />
                  </div>
                </Link>
             </div>
          </Card>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-4">
           {[
             { label: 'Cargar Novedad', href: '/operador/novedades', icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
             { label: 'Rondines', href: '/operador/rondines', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
             { label: 'Mapa Local', href: '/operador/fichaje', icon: MapIcon, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-100' },
             { label: 'Mi Perfil', href: '/operador/perfil', icon: User, color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200' },
           ].map((action, i) => (
             <Link key={i} href={action.href}>
                <Card className={cn(
                  "p-5 border flex flex-col items-center gap-3 text-center transition-all active:scale-[0.95] hover:shadow-xl",
                  action.bg, action.border
                )}>
                   <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm bg-white", action.color)}>
                      <action.icon size={22} />
                   </div>
                   <span className="text-[11px] font-black uppercase text-gray-900 tracking-tight">{action.label}</span>
                </Card>
             </Link>
           ))}
        </div>

        <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-widest pt-4">
          Seguridad Privada Santafesina • Prototipo Operativo
        </p>

      </div>
    </div>
  );
}
