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
import { useAuth } from '@/components/providers/AuthProvider';

export default function GuardiaDashboard() {
  const { isShiftActive, shiftId, shiftData, theme, toggleTheme } = useShift();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignedObjective, setAssignedObjective] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsSource, setGpsSource] = useState<'Satellite' | 'WiFi/Cell' | 'Searching'>('Searching');
  
  const OPERATOR_ID = user?.id || 'recurso_demo';

  useEffect(() => {
    const fetchObjective = async () => {
      try {
        // Try fetching by assigned_to first (Auth UUID), then by id
        let res: any = null;
        
        if (OPERATOR_ID !== 'recurso_demo') {
          // 1st: Try assigned_to (the Auth user ID linked during registration)
          const { data: byAssignedTo } = await supabase
            .from('resources')
            .select('*, objectives(*)')
            .eq('assigned_to', OPERATOR_ID)
            .maybeSingle();
          
          if (byAssignedTo) {
            res = byAssignedTo;
          } else {
            // 2nd: Fallback to direct id match
            const { data: byId } = await supabase
              .from('resources')
              .select('*, objectives(*)')
              .eq('id', OPERATOR_ID)
              .maybeSingle();
            res = byId;
          }
        }

        if (res?.objectives) {
          const obj = Array.isArray(res.objectives) ? res.objectives[0] : res.objectives;
          setAssignedObjective(obj);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchObjective();

    // REAL-TIME: Subscribe to changes on own resource record
    const channel = supabase
      .channel(`resource-${OPERATOR_ID}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'resources' },
        async (payload) => {
          // Check if this update is for our resource (by id or assigned_to)
          const updated = payload.new as any;
          if (updated.assigned_to === OPERATOR_ID || updated.id === OPERATOR_ID) {
            if (updated.current_objective_id) {
              const { data: obj } = await supabase
                .from('objectives')
                .select('*')
                .eq('id', updated.current_objective_id)
                .single();
              setAssignedObjective(obj);
            } else {
              setAssignedObjective(null);
            }
          }
        }
      )
      .subscribe();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    // Watch GPS accuracy for the UI auditor
    let watchId: number | null = null;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setGpsAccuracy(pos.coords.accuracy);
          setGpsSource(pos.coords.accuracy < 30 ? 'Satellite' : 'WiFi/Cell');
        },
        () => setGpsSource('Searching'),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [OPERATOR_ID]);

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
    <div className={cn(
      "min-h-screen pb-32 transition-colors duration-500",
      theme === 'dark' ? "bg-[#0a0a0a]" : "bg-gray-50"
    )}>
      
      {/* Top Banner / Hero */}
      <div className={cn(
        "p-6 pb-20 rounded-b-[3rem] shadow-2xl relative overflow-hidden transition-colors",
        theme === 'dark' ? "bg-zinc-900" : "bg-gray-900 text-white"
      )}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 max-w-5xl mx-auto space-y-6">
           <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
                 <ShieldCheck size={14} className="text-primary" />
                 <span className="text-[10px] font-black uppercase tracking-tight text-primary">704 Guard OS</span>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Theme Toggle */}
                <button 
                  onClick={toggleTheme}
                  className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 text-white hover:bg-white/20 transition-all"
                >
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>

                <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/20 backdrop-blur-md rounded-full border border-green-500/20">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-[10px] font-black uppercase text-green-400">Sistema Online</span>
                </div>
              </div>
           </div>

           <div>
              <p className={cn(
                "font-medium text-sm",
                theme === 'dark' ? "text-gray-400" : "text-gray-400"
              )}>Buen día, Operador</p>
              <h1 className="text-3xl lg:text-5xl font-black tracking-tight leading-tight mt-1 uppercase italic text-white">
                {isShiftActive ? "En Servicio" : "Listo para Iniciar"}
              </h1>
           </div>
        </div>
      </div>

      {/* Overlapping Content Container */}
      <div className="max-w-5xl mx-auto px-6 -mt-12 relative z-20">
        
        {/* GPS Quality Auditor (Premium Widget) */}
        {isShiftActive && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "mb-6 p-4 rounded-3xl border backdrop-blur-xl shadow-2xl flex items-center justify-between gap-4 overflow-hidden relative",
              theme === 'dark' ? "bg-black/60 border-white/10" : "bg-white/80 border-gray-100"
            )}
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all",
                gpsAccuracy && gpsAccuracy < 50 ? "bg-green-500/20 text-green-500" : "bg-primary/20 text-primary"
              )}>
                {gpsAccuracy && gpsAccuracy < 30 ? <MapPin size={24} /> : <Zap size={24} className="animate-pulse" />}
              </div>
              <div>
                <p className={cn("text-[10px] font-black uppercase tracking-widest", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
                  Calidad de Geolocalización
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <h4 className={cn("text-sm font-black uppercase italic", theme === 'dark' ? "text-white" : "text-gray-900")}>
                    {gpsSource === 'Satellite' ? 'Señal Satelital Óptima' : 'Señal WiFi / Triangulación'}
                  </h4>
                  {gpsAccuracy && (
                    <span className={cn(
                      "text-[9px] px-2 py-0.5 rounded-full font-black uppercase border",
                      gpsAccuracy < 30 ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}>
                      ±{Math.round(gpsAccuracy)}m
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="hidden md:block max-w-[200px]">
              <p className="text-[9px] text-gray-500 font-medium leading-relaxed">
                {gpsSource === 'Satellite' 
                  ? 'Precisión certificada para operaciones tácticas.' 
                  : 'Recomendación: Muvete a un lugar abierto para mejorar la precisión GPS.'}
              </p>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Status Column */}
          <div className="lg:col-span-2 space-y-6">
            <Card className={cn(
              "p-0 border-none shadow-2xl overflow-hidden transition-colors",
              theme === 'dark' ? "bg-zinc-900/40 backdrop-blur-md border border-white/5" : "bg-white"
            )}>
              <div className={cn(
                "px-6 py-12 text-center bg-gradient-to-b",
                isShiftActive 
                  ? (theme === 'dark' ? "from-green-500/5 to-transparent" : "from-green-50 to-white") 
                  : (theme === 'dark' ? "from-zinc-800 to-transparent" : "from-gray-50 to-white")
              )}>
                  <div className={cn(
                    "mb-6 inline-flex items-center justify-center w-24 h-24 rounded-full shadow-2xl border",
                    theme === 'dark' ? "bg-zinc-800 border-white/5" : "bg-white border-gray-100"
                  )}>
                    {isShiftActive ? (
                      <Activity size={40} className="text-green-500 animate-pulse" />
                    ) : (
                      <LogOut size={40} className="text-gray-300" />
                    )}
                  </div>
                  
                  {isShiftActive ? (
                    <>
                      <p className={cn(
                        "text-5xl lg:text-7xl font-mono font-black tracking-tighter",
                        theme === 'dark' ? "text-white" : "text-gray-900"
                      )}>
                        {getElapsedTime()}
                      </p>
                      <p className="text-[11px] font-black text-green-600 uppercase tracking-[0.3em] mt-4">Tiempo de Servicio Certificado</p>
                    </>
                  ) : (
                    <>
                      <p className={cn("text-2xl font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>Sin Turno Activo</p>
                      <p className="text-sm text-gray-400 mt-2">Debes fichar entrada desde el mapa operativo</p>
                    </>
                  )}
              </div>

              <div className={cn("p-6 flex gap-4 border-t", theme === 'dark' ? "border-white/5 bg-zinc-900/20" : "bg-gray-50/50 border-gray-100")}>
                  <Link href="/operador/fichaje" className="flex-1">
                    <Button variant={isShiftActive ? "danger" : "success"} className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">
                      {isShiftActive ? "Finalizar Turno" : "Fichar Entrada"}
                    </Button>
                  </Link>
              </div>
            </Card>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Cargar Novedad', href: '/operador/novedades', icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
                { label: 'Rondines', href: '/operador/rondines', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
                { label: 'Mapa Local', href: '/operador/fichaje', icon: MapIcon, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-100' },
                { label: 'Mi Perfil', href: '/operador/perfil', icon: User, color: theme === 'dark' ? 'text-zinc-400' : 'text-gray-600', bg: theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-100', border: theme === 'dark' ? 'border-white/5' : 'border-gray-200' },
              ].map((action, i) => (
                <Link key={i} href={action.href} className="group">
                    <Card className={cn(
                      "p-6 border flex flex-col items-center gap-4 text-center transition-all active:scale-[0.95] group-hover:shadow-2xl group-hover:-translate-y-1",
                      theme === 'dark' ? "bg-zinc-950/20 border-white/5" : action.bg, 
                      theme === 'dark' ? "" : action.border
                    )}>
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                        theme === 'dark' ? "bg-zinc-800" : "bg-white",
                        action.color
                      )}>
                          <action.icon size={28} />
                      </div>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        theme === 'dark' ? "text-gray-300" : "text-gray-900"
                      )}>{action.label}</span>
                    </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Secondary Column: Info & Details */}
          <div className="space-y-6">
            <Card className={cn(
              "p-6 border-none shadow-2xl transition-colors",
              theme === 'dark' ? "bg-zinc-900 border border-white/5" : "bg-white"
            )}>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Puesto Asignado</p>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center border shadow-xl",
                    theme === 'dark' ? "bg-zinc-800 border-white/5" : "bg-gray-900 border-gray-800"
                  )}>
                    <Building2 size={32} className={cn(assignedObjective ? "text-primary" : "text-gray-600")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={cn("text-lg font-black uppercase leading-tight", theme === 'dark' ? "text-white" : "text-gray-900")}>
                      {assignedObjective?.name || 'Esperando Asignación'}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                        <MapPin size={12} className="text-gray-400" />
                        <p className="text-[10px] font-bold text-gray-400 uppercase truncate">
                          {assignedObjective?.address || 'Pendiente de Confirmación'}
                        </p>
                    </div>
                  </div>
                </div>
            </Card>

            <Card className={cn(
              "p-6 border-none shadow-2xl transition-colors",
              theme === 'dark' ? "bg-zinc-900 border border-white/5" : "bg-white"
            )}>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Información del Sistema</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-bold uppercase">704 Version</span>
                  <span className={cn("font-black", theme === 'dark' ? "text-white" : "text-gray-900")}>2.1.0-PRO</span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-gray-50 pt-4 dark:border-white/5">
                  <span className="text-gray-400 font-bold uppercase">Último Sync</span>
                  <span className={cn("font-black", theme === 'dark' ? "text-white" : "text-gray-900")}>Hace 2 min</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-[0.3em] py-12">
          Seguridad Privada Santafesina • Precision & Professionalism
        </p>

      </div>
    </div>
  );
}
