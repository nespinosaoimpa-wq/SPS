'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RotateCw, Navigation, ShieldCheck, Clock, 
  CheckCircle2, AlertTriangle, MapPin, Scan, 
  ChevronRight, Compass, ShieldAlert, ArrowLeft,
  Play, X, QrCode, Target, Shield, History, Map as MapIcon
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import DebugTelemetry from '@/components/operador/DebugTelemetry';
import { GPSTracker } from '@/lib/gps-tracker';

import { useShift } from '@/components/providers/ShiftProvider';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';

const MobileLeaflet = dynamic(() => import('@/components/operador/MobileLeaflet'), { ssr: false });

export default function RondinesPage() {
  const { theme, shiftData, isShiftActive } = useShift();
  const isShiftActiveRef = React.useRef(isShiftActive);
  
  useEffect(() => {
    isShiftActiveRef.current = isShiftActive;
  }, [isShiftActive]);

  const [validating, setValidating] = useState(false);
  const [showMapHUD, setShowMapHUD] = useState(true);
  const [activeTab, setActiveTab] = useState<'status' | 'timeline'>('status');
  
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [activeRound, setActiveRound] = useState<any>(null);
  const [validations, setValidations] = useState<Record<string, string>>({}); 
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [pathHistory, setPathHistory] = useState<{lat: number, lng: number, timestamp: string}[]>([]);
  const [patrolTracker, setPatrolTracker] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState({
    accuracy: null as number | null,
    distanceToTarget: null as number | null,
    syncStatus: 'online' as 'online' | 'offline' | 'pending',
    lastPointTimestamp: null as number | null
  });

  const objectiveId = (shiftData as any)?.objective_id || (shiftData as any)?.current_objective_id;
  const operatorId = (shiftData as any)?.operator_id || (shiftData as any)?.resource_id;

  // FETCH AVATAR
  useEffect(() => {
    if (operatorId && operatorId !== 'recurso_demo') {
       supabase.from('resources').select('avatar_url').eq('id', operatorId).maybeSingle().then(({data}) => {
         if (data?.avatar_url) setAvatarUrl(data.avatar_url);
       });
    }
  }, [operatorId]);

  // CLEANUP ON UNMOUNT
  useEffect(() => {
    return () => {
      if (patrolTracker) {
        patrolTracker.stop();
      }
    };
  }, [patrolTracker]);

  useEffect(() => {
    if (!objectiveId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: routes } = await supabase
          .from('patrol_routes')
          .select('id')
          .eq('objective_id', objectiveId)
          .eq('is_active', true);
        
        const routeIds = routes?.map(r => r.id) || [];
        
        const { data: cpData } = await supabase
          .from('patrol_checkpoints')
          .select('*')
          .in('route_id', routeIds)
          .order('sequence_order', { ascending: true });
        
        setCheckpoints(cpData || []);

        const { data: roundData } = await supabase
          .from('patrol_rounds')
          .select('*')
          .eq('objective_id', objectiveId)
          .eq('resource_id', operatorId)
          .eq('status', 'active')
          .maybeSingle();

        if (roundData) {
          setActiveRound(roundData);
          
          // Fetch existing path points for this round
          const { data: points } = await supabase
            .from('patrol_track_points')
            .select('latitude, longitude, created_at')
            .eq('round_id', roundData.id)
            .order('created_at', { ascending: true });
          
          if (points) {
            setPathHistory(points.map(p => ({ lat: p.latitude, lng: p.longitude, timestamp: p.created_at })));
          }

          startTrackingForRound(roundData.id);
        }
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [objectiveId, operatorId]);

  const startTrackingForRound = async (roundId: string) => {
    const { GPSTracker } = await import('@/lib/gps-tracker');
    const pTracker = new GPSTracker(
      shiftData?.id || 'rondin-shift',
      operatorId,
      async (pos) => {
        if (!isShiftActiveRef.current) {
          if (pTracker) pTracker.stop();
          return;
        }

        const coords = {
          lat: pos.latitude,
          lng: pos.longitude
        };
        const now = new Date().toISOString();
        
        setLocation(coords);
        setPathHistory(prev => [...prev, { ...coords, timestamp: now }]);

        // Update Telemetry UI
        setTelemetry({
          accuracy: pos.accuracy,
          distanceToTarget: pos.distanceToObjective,
          syncStatus: navigator.onLine ? 'online' : 'offline',
          lastPointTimestamp: Date.now()
        });
      },
      (err) => console.warn('Patrol GPS error:', err),
      (shiftData as any)?.objectiveLocation ? {
        location: (shiftData as any).objectiveLocation,
        radius: (shiftData as any).geofenceRadius || 70,
        id: objectiveId
      } : undefined
    );

    // ENABLE HIGH FREQUENCY FOR FORENSIC TRACEABILITY
    pTracker.setHighFrequencyMode(true, roundId);
    
    pTracker.start();
    setPatrolTracker(pTracker);
  };

  const handleStartRound = async () => {
    if (!objectiveId || !operatorId) return;

    // PROXIMITY VALIDATION (< 150m)
    const objectiveLoc = (shiftData as any)?.objectiveLocation;
    if (objectiveLoc && location) {
      const R = 6371e3; // Earth radius in meters
      const p1 = location.lat * Math.PI/180;
      const p2 = objectiveLoc.lat * Math.PI/180;
      const dp = (objectiveLoc.lat - location.lat) * Math.PI/180;
      const dl = (objectiveLoc.lng - location.lng) * Math.PI/180;
      const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;

      if (distance > 150) {
        alert(`🔒 BLOQUEO TÁCTICO: Fuera de perímetro. Se encuentra a ${Math.round(distance)}m del objetivo. Requisito: <150m.`);
        return;
      }
    }

    setValidating(true);
    try {
      const { data, error } = await supabase
        .from('patrol_rounds')
        .insert({
          objective_id: objectiveId,
          resource_id: operatorId,
          status: 'active',
          round_start: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) throw error;
      setActiveRound(data);
      setValidations({});
      setPathHistory([]);
      
      startTrackingForRound(data.id);
      
    } catch(e) {
      console.error(e);
      alert("Error al iniciar la patrulla");
    } finally {
      setValidating(false);
    }
  };

  const handleFinishRound = async () => {
    if (!activeRound) return;
    setValidating(true);
    try {
      const { error } = await supabase
        .from('patrol_rounds')
        .update({ status: 'completed', round_end: new Date().toISOString() })
        .eq('id', activeRound.id);
        
      if (error) throw error;
      
      if (patrolTracker) {
        patrolTracker.stop();
        setPatrolTracker(null);
      }
      
      setActiveRound(null);
      setValidations({});
      // We keep pathHistory until they start a new round or leave
    } catch(e) {
      console.error(e);
      alert("Error al finalizar la patrulla");
    } finally {
      setValidating(false);
    }
  };

  const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const validateCheckpoint = async (cp: any, coords: { lat: number, lng: number }) => {
    if (validations[cp.id]) return; // already validated
    
    setValidating(true);
    const time = new Date().toLocaleTimeString();
    
    setValidations(prev => {
      const updated = { ...prev, [cp.id]: time };
      
      const currentValidated = Object.keys(updated).length;
      if (currentValidated >= checkpoints.length) {
        setTimeout(() => {
          handleFinishRound();
        }, 1500);
      }
      return updated;
    });

    // Also log as a track point for timeline
    setPathHistory(prev => [...prev, { ...coords, timestamp: new Date().toISOString() }]);

    try {
      await api.patrols.validateCheckpoint({
        operator_id: operatorId,
        route_id: cp.route_id,
        checkpoint_id: cp.id,
        latitude: coords.lat,
        longitude: coords.lng,
        shift_id: shiftData?.id
      });
    } catch (err) {
      console.error("Error logging checkpoint validation:", err);
    } finally {
      setValidating(false);
    }
  };

  const getNextCheckpoint = () => {
    for (const cp of checkpoints) {
      if (!validations[cp.id]) return cp;
    }
    return null;
  };
  const nextCp = getNextCheckpoint();

  // Proximity validation auto-trigger
  useEffect(() => {
    if (!activeRound || !location || checkpoints.length === 0) return;
    
    const cp = checkpoints.find(c => !validations[c.id]);
    if (cp && cp.latitude && cp.longitude) {
      const dist = getDistanceInMeters(location.lat, location.lng, cp.latitude, cp.longitude);
      if (dist <= 25) {
        validateCheckpoint(cp, location);
      }
    }
  }, [location, activeRound, checkpoints, validations]);

  const distanceToNextCp = useMemo(() => {
    if (!location || !nextCp || !nextCp.latitude || !nextCp.longitude) return null;
    return getDistanceInMeters(location.lat, location.lng, nextCp.latitude, nextCp.longitude);
  }, [location, nextCp]);

  const routePoints = useMemo(() => pathHistory.map(p => [p.lat, p.lng] as [number, number]), [pathHistory]);

  if (!isShiftActive || !objectiveId) {
    return (
      <div className={cn("min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-10", theme === 'dark' ? "bg-black" : "bg-[#f8f9fc]")}>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-32 h-32 bg-blue-500/10 rounded-[3rem] flex items-center justify-center border border-blue-500/20 shadow-2xl relative"
        >
          <ShieldCheck className="w-16 h-16 text-blue-500" />
          <div className="absolute inset-0 bg-blue-500/5 rounded-[3rem] animate-pulse" />
        </motion.div>
        <div className="space-y-4">
          <h2 className={cn("text-3xl font-black uppercase tracking-tight italic", theme === 'dark' ? "text-white" : "text-gray-900")}>Acceso<br/>Denegado</h2>
          <p className="text-sm text-gray-500 font-medium max-w-xs mx-auto leading-relaxed">
            Iniciá tu <span className="text-blue-600 font-bold">turno de servicio</span> para acceder al sistema de rondines.
          </p>
        </div>
        <Link href="/operador/fichaje">
          <Button className="h-16 px-10 uppercase font-black text-xs tracking-[0.3em] rounded-2xl shadow-xl shadow-blue-500/20 bg-blue-600 hover:bg-blue-700">
            Ir a Fichaje
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col h-screen transition-colors duration-500 overflow-hidden",
      theme === 'dark' ? "bg-black text-white" : "bg-[#f8f9fc] text-gray-900"
    )}>
      
      {/* MOBILE MAP VIEW: GeoZilla Style Split */}
      <div className={cn(
        "relative transition-all duration-700 bg-zinc-900 overflow-hidden",
        showMapHUD ? "h-[45vh]" : "h-0"
      )}>
        <div className="absolute inset-0 z-0">
           <MobileLeaflet 
             currentPosition={location ? [location.lat, location.lng] : (shiftData?.location ? [shiftData.location.lat, shiftData.location.lng] : [-31.6350, -60.7000])} 
             routePoints={routePoints}
             avatarUrl={avatarUrl}
             destinations={checkpoints.filter(cp => cp.latitude).map(cp => ({ id: cp.id, name: cp.name, position: [cp.latitude, cp.longitude] as [number, number] }))}
           />
        </div>

        {/* Floating Back Button */}
        <div className="absolute top-6 left-6 z-20">
          <Link href="/operador">
             <motion.button 
               whileTap={{ scale: 0.9 }}
               className="w-12 h-12 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl flex items-center justify-center border border-white text-gray-800"
             >
                <ArrowLeft size={20} />
             </motion.button>
          </Link>
        </div>
      </div>

      {/* CONTENT SHEET: GeoZilla Rounded Bottom Sheet */}
      <div className={cn(
        "flex-1 flex flex-col min-h-0 relative z-10 -mt-10 rounded-t-[3.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.15)] border-t",
        theme === 'dark' ? "bg-[#0a0a0a] border-white/5" : "bg-white border-gray-100"
      )}>
        
        {/* Handle for visual feel */}
        <div className="w-12 h-1.5 bg-gray-300 dark:bg-white/10 rounded-full mx-auto mt-5 mb-2" />

        {/* TABS: Status vs Timeline */}
        <div className="px-8 mt-4 flex gap-2">
           <button 
             onClick={() => setActiveTab('status')}
             className={cn(
               "flex-1 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
               activeTab === 'status' 
                ? (theme === 'dark' ? "bg-blue-600 text-white" : "bg-blue-600 text-white shadow-lg shadow-blue-500/20")
                : (theme === 'dark' ? "bg-white/5 text-gray-500" : "bg-gray-100 text-gray-400")
             )}
           >
              <MapIcon size={16} /> Estado
           </button>
           <button 
             onClick={() => setActiveTab('timeline')}
             className={cn(
               "flex-1 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
               activeTab === 'timeline' 
                ? (theme === 'dark' ? "bg-blue-600 text-white" : "bg-blue-600 text-white shadow-lg shadow-blue-500/20")
                : (theme === 'dark' ? "bg-white/5 text-gray-500" : "bg-gray-100 text-gray-400")
             )}
           >
              <History size={16} /> Recorrido
           </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-32 pt-8">
          <div className="max-w-md mx-auto">
            
            <AnimatePresence mode="wait">
              {activeTab === 'status' ? (
                <motion.div 
                  key="status"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-10"
                >
                  {/* Status Header */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 mb-2">
                         <div className="status-dot bg-blue-500" />
                         <p className={cn("text-[9px] uppercase tracking-[0.25em] font-black py-1 px-2 rounded-md", theme === 'dark' ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600")}>
                           Live Monitoring
                         </p>
                      </div>
                      <h1 className={cn("text-4xl text-premium leading-none", theme === 'dark' ? "text-white" : "text-gray-900")}>
                        Puesto de <br/><span className="text-blue-600">Control</span>
                      </h1>
                    </div>
                  </div>

                  {/* Target Card */}
                  {activeRound ? (
                    <div className={cn(
                      "p-8 rounded-[3rem] shadow-tactical relative overflow-hidden",
                      theme === 'dark' ? "bg-zinc-900/40 border border-white/5" : "bg-white border border-gray-100"
                    )}>
                      {nextCp ? (
                        <>
                          <div className="flex items-center gap-6 mb-10">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-zinc-800 border border-white/10 flex items-center justify-center shadow-lg">
                              <MapPin className="text-[#D4AF37]" size={32} />
                            </div>
                            <div>
                              <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-[0.15em] mb-1">Próximo Punto</p>
                              <h3 className={cn("text-2xl font-black uppercase tracking-tighter", theme === 'dark' ? "text-white" : "text-gray-900")}>{nextCp.name}</h3>
                              {distanceToNextCp !== null && (
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mt-1">
                                  Distancia: <span className="text-[#D4AF37]">{Math.round(distanceToNextCp)}m</span> (Objetivo: &lt;25m)
                                </p>
                              )}
                            </div>
                          </div>

                          <Button 
                            className={cn(
                              "w-full h-20 text-[11px] font-black tracking-[0.35em] uppercase rounded-2xl border-none transition-all",
                              distanceToNextCp !== null && distanceToNextCp > 25
                                ? "bg-zinc-900 text-zinc-700 border border-white/5 cursor-not-allowed"
                                : "btn-premium"
                            )}
                            onClick={() => {
                              if (location) {
                                if (distanceToNextCp !== null && distanceToNextCp > 25) {
                                  alert(`🔒 BLOQUEO DE DISTANCIA: Se encuentra a ${Math.round(distanceToNextCp)} metros del checkpoint. Debe acercarse a menos de 25m para registrar presencia.`);
                                  return;
                                }
                                validateCheckpoint(nextCp, location);
                              } else {
                                alert("Obteniendo posición GPS...");
                              }
                            }}
                            disabled={validating || !location}
                          >
                            {validating ? (
                              <RotateCw size={24} className="animate-spin" />
                            ) : (
                              <span className="flex items-center gap-3">
                                <Target size={20} /> 
                                {distanceToNextCp !== null && distanceToNextCp > 25 
                                  ? "FUERA DE RANGO" 
                                  : "VALIDAR PRESENCIA"}
                              </span>
                            )}
                          </Button>
                        </>
                      ) : (
                        <div className="text-center py-6">
                          <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
                          <h3 className="text-2xl font-black uppercase tracking-tighter text-emerald-500">Patrulla Completada</h3>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Button 
                        className={cn(
                          "w-full h-24 text-[13px] font-black tracking-[0.45em] uppercase rounded-[2.5rem] border-none transition-all",
                          (telemetry.distanceToTarget && telemetry.distanceToTarget > 150) 
                            ? "bg-zinc-900 text-zinc-700 border border-white/5 cursor-not-allowed" 
                            : "btn-premium"
                        )}
                        onClick={handleStartRound}
                        disabled={validating || loading || (telemetry.distanceToTarget !== null && telemetry.distanceToTarget > 150)}
                      >
                        {loading ? "Cargando..." : (
                          (telemetry.distanceToTarget && telemetry.distanceToTarget > 150) ? (
                            <><ShieldAlert size={32} className="mr-4 text-zinc-800" /> Fuera de Perímetro</>
                          ) : (
                            <><Play size={32} className="mr-4 fill-current" /> INICIAR RONDA</>
                          )
                        )}
                      </Button>
                      {telemetry.distanceToTarget && telemetry.distanceToTarget > 150 && (
                        <p className="text-center text-[10px] font-black text-amber-500 uppercase tracking-widest animate-pulse">
                          Bloqueo: Debe estar a menos de 150m del puesto
                        </p>
                      )}
                    </div>
                  )}

                  {/* Simple List */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Puntos del Objetivo</h3>
                    {checkpoints.map((cp, i) => (
                      <div key={cp.id} className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                        validations[cp.id] ? "bg-emerald-500/5 border-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.05)]" : "bg-zinc-900/40 border-white/5"
                      )}>
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black",
                          validations[cp.id] ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-500"
                        )}>
                          {validations[cp.id] ? <CheckCircle2 size={16} /> : i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-black uppercase tracking-tight text-zinc-100">{cp.name}</p>
                          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                            {validations[cp.id] ? `Validado ${validations[cp.id]}` : 'Pendiente de escaneo'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="timeline"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-10"
                >
                  <div className="space-y-1">
                    <p className={cn("text-[9px] uppercase tracking-[0.25em] font-black py-1 px-2 rounded-md inline-block", theme === 'dark' ? "bg-zinc-800 text-gray-500" : "bg-gray-100 text-gray-400")}>Detailed Path Logs</p>
                    <h1 className={cn("text-4xl text-premium leading-none", theme === 'dark' ? "text-white" : "text-gray-900")}>Historial de <br/><span className="text-blue-600">Recorrido</span></h1>
                  </div>

                  {/* TIMELINE LIST: GeoZilla Style */}
                  <div className="relative space-y-8 pl-4">
                    <div className={cn("absolute left-7 top-4 bottom-4 w-1 rounded-full", theme === 'dark' ? "bg-white/5" : "bg-gray-100")} />
                    
                    {pathHistory.slice().reverse().map((point, i) => {
                      const date = new Date(point.timestamp);
                      const timeStr = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      const dateStr = date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
                      
                      return (
                        <motion.div 
                          key={point.timestamp + i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="relative pl-10"
                        >
                           <div className={cn(
                             "absolute left-1.5 top-2 w-4 h-4 rounded-full border-4 shadow-sm z-10 transition-all",
                             i === 0 ? "bg-blue-600 border-blue-200 scale-125" : "bg-gray-300 border-white dark:bg-zinc-800 dark:border-black"
                           )} />
                           
                           <div className={cn(
                             "p-6 rounded-[2rem] border transition-all",
                             i === 0 
                              ? (theme === 'dark' ? "bg-blue-600/5 border-blue-500/20 shadow-tactical" : "bg-white border-blue-100 shadow-soft") 
                              : (theme === 'dark' ? "bg-zinc-900/20 border-white/5" : "bg-white border-gray-100")
                           )}>
                              <div className="flex justify-between items-start mb-3">
                                 <div>
                                   <p className="text-[11px] text-blue-600 font-black uppercase tracking-widest">{timeStr}</p>
                                   <p className="text-[9px] text-gray-400 font-bold uppercase">{dateStr}</p>
                                 </div>
                                 <div className="bg-gray-50 dark:bg-white/5 px-2.5 py-1.5 rounded-xl border border-black/5 dark:border-white/5">
                                    <p className="text-[9px] font-mono font-black text-gray-400 uppercase tracking-tighter">
                                      {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                                    </p>
                                 </div>
                              </div>
                              <p className={cn("text-[13px] font-black uppercase tracking-tight", theme === 'dark' ? "text-white" : "text-gray-800")}>
                                {i === 0 ? 'Posición Actual' : 'Punto de Seguimiento'}
                              </p>
                              <div className="mt-4 flex items-center gap-2">
                                 <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                 <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Señal GPS Estable</span>
                              </div>
                           </div>
                        </motion.div>
                      );
                    })}

                    {pathHistory.length === 0 && (
                      <div className="text-center py-20 opacity-30">
                        <History size={48} className="mx-auto mb-4" />
                        <p className="text-sm font-black uppercase tracking-widest text-premium">Sin datos de recorrido</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Global Actions */}
            {activeRound && (
              <div className="flex flex-col gap-3 pt-10 pb-20">
                <Button onClick={handleFinishRound} variant="ghost" className="h-16 text-red-500/60 text-[10px] font-black tracking-widest uppercase hover:text-red-500 hover:bg-red-50 rounded-2xl">
                   Finalizar Patrulla
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <DebugTelemetry 
        accuracy={telemetry.accuracy}
        distanceToTarget={telemetry.distanceToTarget}
        syncStatus={telemetry.syncStatus}
        lastPointTimestamp={telemetry.lastPointTimestamp}
        isVisible={!!activeRound}
      />
    </div>
  );
}
