'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RotateCw, Navigation, ShieldCheck, Clock, 
  CheckCircle2, AlertTriangle, MapPin, Scan, 
  ChevronRight, Compass, ShieldAlert, ArrowLeft,
  Play, X, QrCode, Target, Shield
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { QRScanner } from '@/components/ui/QRScanner';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import Link from 'next/link';

import { useShift } from '@/components/providers/ShiftProvider';
import { supabase } from '@/lib/supabase';

const MobileLeaflet = dynamic(() => import('@/components/operador/MobileLeaflet'), { ssr: false });

export default function RondinesPage() {
  const { theme, shiftData, isShiftActive } = useShift();
  const isShiftActiveRef = React.useRef(isShiftActive);
  
  useEffect(() => {
    isShiftActiveRef.current = isShiftActive;
  }, [isShiftActive]);

  const [showScanner, setShowScanner] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showMapHUD, setShowMapHUD] = useState(true);
  
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [activeRound, setActiveRound] = useState<any>(null);
  const [validations, setValidations] = useState<Record<string, string>>({}); 
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [patrolTracker, setPatrolTracker] = useState<any>(null);

  const objectiveId = (shiftData as any)?.objective_id || (shiftData as any)?.current_objective_id;
  const operatorId = (shiftData as any)?.operator_id || (shiftData as any)?.resource_id;

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
          // Resume tracking if round was active
          startTrackingForRound(roundData.id);
        }
      } catch (e: any) {
        console.error(e);
        setErrorMsg('Error cargando rondín');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [objectiveId, operatorId]);

  const startTrackingForRound = async (roundId: string) => {
    const { GPSTracker } = await import('@/lib/gps-tracker');
    const pTracker = new GPSTracker(
      async (pos) => {
        // SAFETY GUARD: Check if shift or round is still active
        if (!isShiftActiveRef.current) {
          if (pTracker) pTracker.stop();
          return;
        }

        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setLocation(coords);

        // Record point
        supabase.from('patrol_track_points').insert([{
          round_id: roundId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed
        }]).then();

        // Update live status
        fetch('/api/tracking/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shiftData: { operator_id: operatorId },
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed,
            heading: pos.coords.heading
          })
        }).then();
      },
      (err) => console.warn('Patrol GPS error:', err.message),
      2000
    );
    pTracker.start();
    setPatrolTracker(pTracker);
  };

  const handleStartRound = async () => {
    if (!objectiveId || !operatorId) return;
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
    } catch(e) {
      console.error(e);
      alert("Error al finalizar la patrulla");
    } finally {
      setValidating(false);
    }
  };

  const handleScanSuccess = async (qrData: string) => {
    setShowScanner(false);
    setValidating(true);
    
    const cp = checkpoints.find(c => c.qr_code === qrData || c.id?.substring(0,8) === qrData || c.id === qrData || c.name === qrData);
    
    if (cp) {
      setValidations(prev => ({ ...prev, [cp.id]: new Date().toLocaleTimeString() }));
      const currentValidated = Object.keys(validations).length + 1;
      if (currentValidated >= checkpoints.length) {
        setTimeout(() => {
          handleFinishRound();
        }, 1500);
      }
    } else {
      alert("Código QR no válido para este objetivo.");
    }
    
    setTimeout(() => {
      setValidating(false);
    }, 1000);
  };

  const getNextCheckpoint = () => {
    for (const cp of checkpoints) {
      if (!validations[cp.id]) return cp;
    }
    return null;
  };
  const nextCp = getNextCheckpoint();

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
          <h2 className={cn("text-3xl font-black uppercase tracking-tight italic", theme === 'dark' ? "text-white" : "text-gray-900")}>Protocolo<br/>Restringido</h2>
          <p className="text-sm text-gray-500 font-medium max-w-xs mx-auto leading-relaxed">
            El sistema de rondines tácticos requiere que inicies tu <span className="text-blue-600 font-bold">turno de servicio</span> primero.
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
        showMapHUD ? "h-[40vh]" : "h-0"
      )}>
        <div className="absolute inset-0 z-0">
           <MobileLeaflet 
             currentPosition={location ? [location.lat, location.lng] : (shiftData?.location ? [shiftData.location.lat, shiftData.location.lng] : [-31.6350, -60.7000])} 
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
        "flex-1 flex flex-col min-h-0 relative z-10 -mt-8 rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] border-t",
        theme === 'dark' ? "bg-[#111] border-white/5" : "bg-white border-gray-100"
      )}>
        
        {/* Handle for visual feel */}
        <div className="w-12 h-1.5 bg-gray-300 dark:bg-white/10 rounded-full mx-auto mt-4 mb-2" />

        <div className="flex-1 overflow-y-auto px-8 pb-32 pt-4">
          <div className="max-w-md mx-auto space-y-10">
            
            {/* Header Status */}
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-1">
                   <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                   <p className={cn("text-[10px] uppercase tracking-[0.2em] font-black", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
                     Control de Ronda
                   </p>
                </div>
                <h1 className={cn("text-3xl font-black uppercase tracking-tight leading-tight", theme === 'dark' ? "text-white" : "text-gray-900")}>
                  Seguimiento <br/>Táctico
                </h1>
              </div>
              <div className="text-right">
                 <div className={cn(
                   "px-4 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-widest",
                   activeRound ? "bg-blue-500/10 border-blue-500/20 text-blue-500" : "bg-gray-100 border-gray-200 text-gray-400"
                 )}>
                   {activeRound ? 'PATRULLA ON' : 'STOP'}
                 </div>
              </div>
            </div>

            {/* Target Card: GeoZilla Premium Card */}
            {activeRound ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden",
                  theme === 'dark' ? "bg-blue-600/10 border border-blue-500/20" : "bg-blue-50/50 border border-blue-100"
                )}
              >
                {nextCp ? (
                  <>
                    <div className="flex items-center gap-6 mb-10">
                      <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <MapPin className="text-white" size={32} />
                      </div>
                      <div>
                        <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.15em] mb-1">Próximo Objetivo</p>
                        <h3 className={cn("text-xl font-black tracking-tight", theme === 'dark' ? "text-white" : "text-gray-900")}>{nextCp.name}</h3>
                      </div>
                    </div>

                    <Button 
                      className="w-full h-20 text-xs font-black tracking-[0.3em] uppercase shadow-2xl shadow-blue-500/30 rounded-[1.75rem] bg-blue-600 hover:bg-blue-700"
                      onClick={() => setShowScanner(true)}
                      disabled={validating}
                    >
                      {validating ? (
                        <RotateCw size={24} className="animate-spin" />
                      ) : (
                        <span className="flex items-center gap-3">
                          <QrCode size={24} /> VALIDAR POSICIÓN
                        </span>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                       <CheckCircle2 size={40} className="text-green-500" />
                    </div>
                    <h3 className="text-2xl font-black uppercase text-green-500 tracking-tight">¡Objetivos Cumplidos!</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase mt-3 tracking-widest">Patrulla completada con éxito</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <Button 
                className="w-full h-24 text-sm font-black tracking-[0.4em] uppercase shadow-2xl shadow-blue-500/20 rounded-[2.5rem] bg-blue-600 hover:bg-blue-700"
                onClick={handleStartRound}
                disabled={validating || loading}
              >
                {loading ? "Sincronizando..." : (
                  <>
                    <Play size={28} className="mr-4 fill-current" /> INICIAR PATRULLA
                  </>
                )}
              </Button>
            )}

            {/* Checkpoint Sequence: Minimalist Modern List */}
            {checkpoints.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className={cn("text-[10px] font-black uppercase tracking-widest", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>Recorrido Estándar</h3>
                  <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-500/5 px-3 py-1 rounded-full">{Object.keys(validations).length}/{checkpoints.length} Vistos</span>
                </div>
                
                <div className="space-y-3">
                  {checkpoints.map((cp, i) => {
                    const isVal = !!validations[cp.id];
                    const isAct = nextCp?.id === cp.id;
                    
                    return (
                      <motion.div 
                        key={cp.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={cn(
                          "relative pl-14 pr-6 py-5 rounded-2xl transition-all border",
                          isAct ? (theme === 'dark' ? "border-blue-500/30 bg-blue-500/5 shadow-xl shadow-blue-500/5" : "border-blue-200 bg-blue-50/30") : 
                          isVal ? (theme === 'dark' ? "border-green-500/20 bg-green-500/5" : "border-green-100 bg-green-50/30") : 
                          (theme === 'dark' ? "border-white/5 bg-transparent opacity-40" : "border-gray-100 bg-white")
                        )}
                      >
                        <div className={cn(
                          "absolute left-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full z-10 flex items-center justify-center shadow-md border-2",
                          isVal ? "bg-green-500 border-green-500 text-white" : 
                          isAct ? "bg-blue-600 border-blue-600 text-white animate-pulse" : (theme === 'dark' ? "bg-zinc-800 border-white/10" : "bg-white border-gray-200")
                        )}>
                          {isVal ? <CheckCircle2 size={16} /> : <div className="text-[10px] font-black">{i+1}</div>}
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className={cn("text-xs font-black uppercase tracking-widest", theme === 'dark' ? "text-white" : "text-gray-900")}>{cp.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock size={10} className="text-gray-400" />
                              <p className="text-[9px] text-gray-400 font-black tracking-widest">{validations[cp.id] || 'Pendiente'}</p>
                            </div>
                          </div>
                          {isAct && (
                             <div className="px-3 py-1 bg-blue-600 text-[8px] font-black text-white uppercase rounded-full shadow-lg">
                                AQUÍ
                             </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tactical Footer: Clean Buttons */}
            {activeRound && (
              <div className="flex flex-col gap-3 pt-6 pb-20">
                <Button variant="outline" className={cn(
                  "h-16 rounded-2xl text-[10px] font-black tracking-widest uppercase border-2",
                  theme === 'dark' ? "border-white/5 text-white hover:bg-white/5" : "border-gray-100 text-gray-700"
                )}>
                  <ShieldAlert size={16} className="mr-2 text-blue-500" /> Reportar Incidencia
                </Button>
                <Button onClick={handleFinishRound} variant="ghost" className="h-16 text-red-500/60 text-[10px] font-black tracking-widest uppercase hover:text-red-500 hover:bg-red-50 rounded-2xl">
                   Finalizar Patrulla
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showScanner && (
        <QRScanner 
          onScan={handleScanSuccess}
          onCancel={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
