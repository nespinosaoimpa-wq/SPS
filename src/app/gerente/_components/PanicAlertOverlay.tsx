'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  MapPin, 
  Phone, 
  AlertOctagon, 
  X, 
  ShieldAlert, 
  Navigation,
  CheckCircle2,
  BellRing,
  Hospital,
  Flame,
  User,
  Building
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { fetchNearbyEmergencyServices, NearbyPOI } from '@/lib/nearby-services';
import { supabase } from '@/lib/supabase';

const MapView = dynamic(() => import('@/components/MapView'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-zinc-900 animate-pulse flex items-center justify-center text-zinc-500 font-bold uppercase text-xs">Cargando Posición Satelital...</div>
});

interface PanicAlertOverlayProps {
  alert: any;
  onDismiss: () => void;
  onResolve: (notes: string) => void;
}

export default function PanicAlertOverlay({ alert, onDismiss, onResolve }: PanicAlertOverlayProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [nearbyServices, setNearbyServices] = useState<NearbyPOI[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [operatorName, setOperatorName] = useState<string>('Operador en Guardia');
  const [operatorPhone, setOperatorPhone] = useState<string>('');
  const [objectiveName, setObjectiveName] = useState<string>('Puesto Operativo');

  useEffect(() => {
    if (!alert) return;

    // 1. Resolve Operator Name & Phone from Supabase if not provided directly
    const opId = alert.operator_id || alert.triggered_by || alert.resource_id;
    if (opId) {
      supabase
        .from('resources')
        .select('name, phone, phone_number, cel, current_objective_id, objectives:current_objective_id(name)')
        .eq('id', opId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setOperatorName(data.name || alert.resource_name || 'Operador en Guardia');
            setOperatorPhone(data.phone || data.phone_number || data.cel || alert.phone || '');
            if (data.objectives?.name) {
              setObjectiveName(data.objectives.name);
            }
          } else if (alert.resource_name) {
            setOperatorName(alert.resource_name);
          }
        });
    } else if (alert.resource_name) {
      setOperatorName(alert.resource_name);
    }

    // 2. Fetch nearby emergency services (Hospital, Police, Fire station)
    if (alert.latitude && alert.longitude) {
      setLoadingServices(true);
      fetchNearbyEmergencyServices(alert.latitude, alert.longitude)
        .then(res => setNearbyServices(res.slice(0, 3)))
        .finally(() => setLoadingServices(false));
    }
  }, [alert?.id, alert?.latitude, alert?.longitude]);

  useEffect(() => {
    // 3. Play emergency alert sound
    if (typeof window !== 'undefined' && alert) {
      audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
      audioRef.current.loop = true;
      audioRef.current.play().catch(e => console.warn('Audio auto-play blocked:', e));
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [alert?.id]);

  if (!alert) return null;

  const alertLat = alert.latitude || alert.operator_latitude;
  const alertLng = alert.longitude || alert.operator_longitude;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      >
        {/* Pulsing red backdrop */}
        <motion.div 
          animate={{ 
            backgroundColor: ['rgba(153, 27, 27, 0.92)', 'rgba(0, 0, 0, 0.96)', 'rgba(153, 27, 27, 0.92)'] 
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="fixed inset-0 backdrop-blur-xl"
        />

        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="relative w-full max-w-6xl bg-zinc-950 border-4 border-red-600 rounded-[2.5rem] shadow-[0_0_100px_rgba(220,38,38,0.6)] overflow-hidden flex flex-col lg:flex-row max-h-[94vh] my-auto"
        >
          {/* Left Side: Info & Actions */}
          <div className="flex-1 p-6 md:p-10 flex flex-col justify-between overflow-y-auto max-h-[94vh] space-y-6">
            <div className="space-y-6">
              
              {/* Emergency Header */}
              <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-2xl animate-bounce shrink-0">
                  <Zap size={32} className="text-white fill-current" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter italic leading-none">
                    ALERTA S.O.S EN TIEMPO REAL
                  </h1>
                  <p className="text-red-500 font-black text-[11px] uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                    <BellRing size={14} className="animate-pulse" /> Intervención de Emergencia Prioritaria
                  </p>
                </div>
              </div>

              {/* Operator & Alert Summary Box */}
              <div className="bg-zinc-900 border border-red-500/30 rounded-3xl p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 shrink-0">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="text-xl font-black text-white uppercase tracking-tight">{operatorName}</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1">
                        <Building size={12} className="text-amber-500" /> {objectiveName}
                      </p>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Hora Alerta</p>
                    <p className="text-lg font-mono font-bold text-zinc-200">
                      {new Date(alert.created_at || Date.now()).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} HS
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10">
                  <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Novedad / Mensaje Transmitido</p>
                  <p className="text-sm sm:text-base text-zinc-100 font-bold italic bg-red-950/40 p-3 rounded-xl border border-red-500/20">
                    "{alert.content || alert.message || '🚨 ¡ALERTA S.O.S ACTIVADA! Operador requiere asistencia inmediata.'}"
                  </p>
                </div>
              </div>

              {/* Coordinates & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-zinc-900 rounded-2xl p-3.5 border border-white/10 flex items-center gap-3">
                   <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 shrink-0">
                      <MapPin size={18} />
                   </div>
                   <div className="min-w-0">
                     <p className="text-[9px] font-black text-zinc-500 uppercase tracking-tight">Posición GPS</p>
                     <p className="text-xs font-mono font-bold text-white truncate">
                       {alertLat ? `${alertLat.toFixed(5)}, ${alertLng.toFixed(5)}` : 'Sincronizando...'}
                     </p>
                   </div>
                </div>
                <div className="bg-zinc-900 rounded-2xl p-3.5 border border-white/10 flex items-center gap-3">
                   <div className="w-9 h-9 bg-red-500/20 rounded-xl flex items-center justify-center text-red-500 shrink-0">
                      <ShieldAlert size={18} />
                   </div>
                   <div>
                     <p className="text-[9px] font-black text-zinc-500 uppercase tracking-tight">Estado de Alarma</p>
                     <p className="text-xs font-black text-red-500 uppercase">EMERGENCIA CRÍTICA</p>
                   </div>
                </div>
              </div>

              {/* Nearby Services Display */}
              <div className="space-y-2">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Servicios de Emergencia Cercanos</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {loadingServices ? (
                    [1,2,3].map(i => <div key={i} className="h-14 bg-zinc-900 animate-pulse rounded-2xl border border-white/5" />)
                  ) : nearbyServices.length > 0 ? (
                    nearbyServices.map(poi => (
                      <div key={poi.id} className="bg-zinc-900 border border-white/10 rounded-2xl p-2.5 flex items-center gap-2.5">
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                          poi.type === 'hospital' ? "bg-red-500/20 text-red-400" :
                          poi.type === 'police' ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"
                        )}>
                          {poi.type === 'hospital' ? <Hospital size={16} /> : 
                           poi.type === 'police' ? <ShieldAlert size={16} /> : <Flame size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-white truncate">{poi.name}</p>
                          <p className="text-[8px] text-zinc-400 font-bold uppercase">{poi.estimatedETA} min • {poi.distance}m</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-2 text-[10px] text-zinc-500 uppercase font-bold italic">
                      Coordenadas capturadas · Servicios en alerta
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button 
                  className="h-14 sm:h-16 rounded-2xl bg-white text-black hover:bg-zinc-200 font-black uppercase text-xs sm:text-sm tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                  onClick={() => window.open(operatorPhone ? `tel:${operatorPhone}` : 'tel:', '_self')}
                >
                  <Phone size={20} className="text-black" />
                  {operatorPhone ? `Llamar a ${operatorName.split(' ')[0]}` : 'Llamar al Operador'}
                </Button>

                <Button 
                  className="h-14 sm:h-16 rounded-2xl bg-red-600 text-white hover:bg-red-700 font-black uppercase text-xs sm:text-sm tracking-widest shadow-xl flex items-center justify-center gap-2 border-none transition-all active:scale-95 shadow-red-600/30"
                  onClick={() => window.open('tel:911', '_self')}
                >
                  <AlertOctagon size={20} /> Llamar al 911
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline"
                  className="h-12 rounded-xl border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 uppercase font-bold text-[10px] tracking-widest"
                  onClick={onDismiss}
                >
                  <X size={16} className="mr-1" /> Silenciar Alerta
                </Button>

                <Button 
                  className="h-12 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 border-none"
                  onClick={() => {
                    if (confirm('¿Confirmas que la emergencia S.O.S ha sido atendida y deseas cerrar la alerta?')) {
                      onResolve('Alerta S.O.S resuelta y verificada por gerencia.');
                    }
                  }}
                >
                  <CheckCircle2 size={16} className="mr-1" /> Concluir Gestión
                </Button>
              </div>
            </div>
          </div>

          {/* Right Side: Visual Satellite Map Centered on S.O.S Location */}
          <div className="w-full lg:w-[460px] h-[300px] lg:h-auto bg-black relative border-t-4 lg:border-t-0 lg:border-l-4 border-red-600 shrink-0">
             <div className="absolute top-4 left-4 z-20">
                <div className="bg-red-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-2">
                   <Navigation size={14} className="animate-pulse" /> Punto Exacto de S.O.S
                </div>
             </div>

             <MapView 
               center={(alertLat && alertLng) ? [alertLat, alertLng] : undefined} 
               zoom={17}
               className="w-full h-full"
               tileStyle="satellite"
               incidents={(alertLat && alertLng) ? [{
                 id: alert.id || 'sos-active-point',
                 entry_type: 'panic',
                 content: `🚨 S.O.S: ${operatorName}`,
                 latitude: alertLat,
                 longitude: alertLng,
                 status: 'critica'
               }] : []}
               guards={(alertLat && alertLng) ? [{
                 id: alert.id || 'sos-guard-point',
                 name: operatorName,
                 latitude: alertLat,
                 longitude: alertLng,
                 status: 'abandoned',
                 role: 'operador'
               }] : []}
             />
             <div className="absolute inset-0 pointer-events-none border-[16px] border-red-600/30 mix-blend-overlay animate-pulse" />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
