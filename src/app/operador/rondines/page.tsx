'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RotateCw, Navigation, ShieldCheck, Clock, 
  CheckCircle2, AlertTriangle, MapPin, Scan, 
  ChevronRight, Compass, ShieldAlert, ArrowLeft,
  Play
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
  const [showScanner, setShowScanner] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showMapHUD, setShowMapHUD] = useState(true);
  
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [activeRound, setActiveRound] = useState<any>(null);
  const [validations, setValidations] = useState<Record<string, string>>({}); // cp.id -> timestamp
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [patrolTracker, setPatrolTracker] = useState<any>(null);

  const objectiveId = (shiftData as any)?.objective_id || (shiftData as any)?.current_objective_id;
  const operatorId = (shiftData as any)?.operator_id || (shiftData as any)?.resource_id;

  useEffect(() => {
    if (!objectiveId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch checkpoints
        // Fetch routes first
        const { data: routes } = await supabase
          .from('patrol_routes')
          .select('id')
          .eq('objective_id', objectiveId)
          .eq('is_active', true);
        
        const routeIds = routes?.map(r => r.id) || [];
        
        // Fetch checkpoints for these routes
        const { data: cpData } = await supabase
          .from('patrol_checkpoints')
          .select('*')
          .in('route_id', routeIds)
          .order('sequence_order', { ascending: true });
        
        setCheckpoints(cpData || []);

        // Fetch active round if any
        const { data: roundData } = await supabase
          .from('patrol_rounds')
          .select('*')
          .eq('objective_id', objectiveId)
          .eq('resource_id', operatorId)
          .eq('status', 'active')
          .maybeSingle();

        if (roundData) {
          setActiveRound(roundData);
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
      
      // Start GPS Tracker for the round
      const { GPSTracker } = await import('@/lib/gps-tracker');
      const pTracker = new GPSTracker(
        async (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          
          // Update local UI
          setLocation(coords);

          // 1. Record specific patrol point
          supabase.from('patrol_track_points').insert([{
            round_id: data.id,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed
          }]).then();

          // 2. Update general tracking (so manager sees live movement on main map)
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
        (err) => console.warn('Patrol GPS tracking error:', err.message),
        1500 // More frequent updates (1.5s) during patrol
      );
      pTracker.start();
      setPatrolTracker(pTracker);
      
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
      
      // Stop tracking
      if (patrolTracker) {
        patrolTracker.stop();
        setPatrolTracker(null);
      }
      
      setActiveRound(null);
      setValidations({});
      alert("Patrulla completada exitosamente.");
    } catch(e) {
      console.error(e);
      alert("Error al finalizar la patrulla");
    } finally {
      setValidating(false);
    }
  };

  const handleValidationClick = () => {
    setShowScanner(true);
  };

  const handleScanSuccess = async (qrData: string) => {
    setShowScanner(false);
    setValidating(true);
    
    // Find checkpoint by QR
    const cp = checkpoints.find(c => c.qr_code === qrData || c.id?.substring(0,8) === qrData || c.id === qrData || c.name === qrData);
    
    if (cp) {
      // Record validation locally (could be sent to DB)
      setValidations(prev => ({ ...prev, [cp.id]: new Date().toLocaleTimeString() }));
      
      // Auto-finish if it's the last one
      const currentValidated = Object.keys(validations).length + 1;
      if (currentValidated >= checkpoints.length) {
        setTimeout(() => {
          handleFinishRound();
        }, 1500);
      }
    } else {
      alert("Código QR no corresponde a un punto válido de este objetivo.");
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
      <div className={cn("min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-8", theme === 'dark' ? "bg-black" : "bg-gray-50")}>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center border border-primary/20 shadow-2xl"
        >
          <ShieldCheck className="w-12 h-12 text-primary" />
        </motion.div>
        <div className="space-y-3">
          <h2 className={cn("text-2xl font-black uppercase tracking-tighter italic", theme === 'dark' ? "text-white" : "text-gray-900")}>Acceso Restringido</h2>
          <p className="text-sm text-gray-500 font-medium max-w-xs mx-auto">
            El sistema de rondines requiere un <span className="text-primary font-bold">turno activo</span> en un objetivo válido.
          </p>
        </div>
        <Link href="/operador">
          <Button className="h-14 px-8 uppercase font-black text-xs tracking-widest rounded-2xl shadow-xl shadow-primary/20">
            Volver al Centro de Mando
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col min-h-screen transition-colors duration-500",
      theme === 'dark' ? "bg-black text-white" : "bg-gray-50 text-gray-900"
    )}>
      
      {/* Mobile Map Header / Desktop Layout Wrapper */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        
        {/* Map Section (Fixed height on mobile, full height on desktop) */}
        <div className={cn(
          "relative transition-all duration-700 bg-zinc-900 border-b lg:border-r overflow-hidden",
          theme === 'dark' ? "border-white/5" : "border-gray-200",
          showMapHUD ? (isMobile() ? "h-[35vh]" : "lg:h-full lg:w-1/2") : "h-16 lg:w-20"
        )}>
          <div className="absolute inset-0 z-0">
             <MobileLeaflet 
               currentPosition={location ? [location.lat, location.lng] : (shiftData?.location ? [shiftData.location.lat, shiftData.location.lng] : [-31.6350, -60.7000])} 
               destinations={checkpoints.filter(cp => cp.latitude).map(cp => ({ id: cp.id, name: cp.name, position: [cp.latitude, cp.longitude] as [number, number] }))}
             />
          </div>

          {/* Map Overlay Controls */}
          <div className="absolute top-4 left-4 z-20 flex gap-2">
            <Link href="/operador">
               <button className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl shadow-lg flex items-center justify-center border border-gray-100 text-gray-600">
                  <ArrowLeft size={20} />
               </button>
            </Link>
          </div>

          <div className="absolute top-4 right-4 z-20">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "h-10 w-10 rounded-xl border backdrop-blur-md",
                theme === 'dark' ? "bg-black/40 border-primary/30 text-primary" : "bg-white/80 border-gray-100 text-gray-600"
              )}
              onClick={() => setShowMapHUD(!showMapHUD)}
            >
              <Compass className={cn("transition-transform", showMapHUD && "rotate-180")} size={20} />
            </Button>
          </div>
        </div>

        {/* content Section (Checkpoints & Actions) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 pb-32">
          <div className="max-w-2xl mx-auto space-y-8">
            
            {/* Header Status */}
            <div className="flex justify-between items-end">
              <div>
                <p className={cn("text-[10px] uppercase tracking-[0.3em] font-black mb-1 flex items-center gap-2", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
                  <Scan size={14} className="text-primary" /> Sistema de Rondines
                </p>
                <h1 className={cn("text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-tight italic", theme === 'dark' ? "text-white" : "text-gray-900")}>
                  Protocolo <br/>Táctico Activo
                </h1>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-primary font-black uppercase mb-1 tracking-widest italic">
                  Status: {activeRound ? 'En Progreso' : 'Inactivo'}
                </p>
                {activeRound && (
                  <div className="flex justify-end gap-1.5">
                    {checkpoints.map((_, i) => (
                      <div key={i} className={cn(
                        "w-4 h-1.5 rounded-full",
                        i < Object.keys(validations).length ? "bg-primary" : (theme === 'dark' ? "bg-white/10" : "bg-gray-200")
                      )} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Validation Target Overlay */}
            {activeRound ? (
              <Card className={cn(
                "border-none shadow-2xl relative overflow-hidden transition-colors",
                theme === 'dark' ? "bg-zinc-900/40 backdrop-blur-md border border-white/5" : "bg-white"
              )}>
                <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                <CardContent className="p-8">
                  {nextCp ? (
                    <>
                      <div className="flex items-center gap-6 mb-8">
                        <div className={cn(
                          "w-16 h-16 rounded-2xl flex items-center justify-center relative shadow-xl",
                          theme === 'dark' ? "bg-zinc-800" : "bg-amber-50"
                        )}>
                          <MapPin className="text-primary" size={32} />
                          <div className="absolute inset-0 bg-primary/20 animate-ping rounded-2xl" />
                        </div>
                        <div>
                          <h3 className={cn("text-lg font-black uppercase tracking-tight", theme === 'dark' ? "text-white" : "text-gray-900")}>{nextCp.name}</h3>
                          <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">Próximo Punto Objetivo</p>
                        </div>
                      </div>

                      <Button 
                        className="w-full h-18 text-xs font-black tracking-[0.4em] uppercase shadow-2xl shadow-primary/20 group relative overflow-hidden rounded-2xl"
                        onClick={handleValidationClick}
                        disabled={validating}
                        variant="primary"
                      >
                        {validating ? (
                          <span className="flex items-center gap-3">
                            <RotateCw size={20} className="animate-spin" /> ESCANEANDO...
                          </span>
                        ) : (
                          <span className="flex items-center gap-3 relative z-10">
                            <ShieldCheck size={24} /> VALIDAR PUNTO (QR)
                          </span>
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                      <h3 className="text-xl font-black uppercase text-green-500">Patrulla Completada</h3>
                      <p className="text-xs text-gray-400 font-bold uppercase mt-2">Todos los puntos validados</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Button 
                className="w-full h-20 text-sm font-black tracking-[0.4em] uppercase shadow-2xl shadow-primary/20 rounded-3xl"
                onClick={handleStartRound}
                disabled={validating || loading}
                variant="primary"
              >
                {loading ? "Cargando..." : (
                  <>
                    <Play size={24} className="mr-3 fill-current" /> INICIAR PATRULLAJE
                  </>
                )}
              </Button>
            )}

            {/* Checkpoint Sequence */}
            {checkpoints.length > 0 && activeRound && (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <h3 className={cn("text-[10px] font-black uppercase tracking-[0.2em]", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>Secuencia del Operativo</h3>
                  <span className="text-[10px] font-black text-primary uppercase">{Object.keys(validations).length}/{checkpoints.length} Nodos Completados</span>
                </div>
                
                <div className="space-y-3 relative">
                  <div className={cn("absolute left-7 top-4 bottom-4 w-0.5", theme === 'dark' ? "bg-white/5" : "bg-gray-100")} />
                  
                  {checkpoints.map((cp, i) => {
                    const isVal = !!validations[cp.id];
                    const isAct = nextCp?.id === cp.id;
                    
                    return (
                      <motion.div 
                        key={cp.id}
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={cn(
                          "relative pl-16 pr-6 py-5 rounded-2xl transition-all border shadow-sm",
                          isAct ? "border-primary/40 bg-primary/5 shadow-primary/5" : 
                          isVal ? (theme === 'dark' ? "border-green-500/10 bg-zinc-900/40" : "border-green-100 bg-green-50/30") : 
                          (theme === 'dark' ? "border-white/5 bg-transparent opacity-40" : "border-gray-100 bg-white opacity-40")
                        )}
                      >
                        <div className={cn(
                          "absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 z-10 flex items-center justify-center shadow-lg",
                          isVal ? "bg-green-500 border-green-500 text-black" : 
                          isAct ? "bg-primary border-primary animate-pulse" : (theme === 'dark' ? "bg-black border-white/20" : "bg-white border-gray-200")
                        )}>
                          {isVal && <CheckCircle2 size={12} />}
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className={cn("text-xs font-black uppercase tracking-widest", theme === 'dark' ? "text-white" : "text-gray-900")}>{cp.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock size={10} className="text-gray-400" />
                              <p className="text-[9px] text-gray-400 font-black uppercase">{validations[cp.id] || '--:--'}</p>
                            </div>
                          </div>
                          {isAct && (
                             <div className="px-3 py-1 bg-primary text-[8px] font-black text-black uppercase rounded-full shadow-lg shadow-primary/20">
                                Actual
                             </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tactical Footer Actions */}
            {activeRound && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-10">
                <Button variant="outline" className={cn(
                  "h-14 rounded-2xl text-[10px] font-black tracking-widest uppercase border-2",
                  theme === 'dark' ? "border-white/10 text-white hover:bg-white/5" : "border-gray-200 text-gray-700"
                )}>
                  <ShieldAlert size={16} className="mr-2 text-primary" /> Reportar Incidencia
                </Button>
                <Button onClick={handleFinishRound} variant="ghost" className="h-14 text-red-500/70 text-[10px] font-black tracking-widest uppercase hover:text-red-500 hover:bg-red-50 rounded-2xl">
                   Abortar Patrulla
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

function isMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 1024;
}
