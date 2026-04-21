'use client';

import React, { useState, useEffect } from 'react';
import { 
  MapPin, LogIn, LogOut, Navigation, 
  ShieldCheck, AlertCircle, ArrowLeft, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import dynamic from 'next/dynamic';

import { useShift } from '@/components/providers/ShiftProvider';
import { supabase } from '@/lib/supabase';
import GPSConsentModal from '@/components/legal/GPSConsentModal';

const MobileLeaflet = dynamic(() => import('@/components/operador/MobileLeaflet'), { ssr: false });

export default function FichajePage() {
  const { isShiftActive, shiftId, startShift, endShift } = useShift();
  const isShiftActiveRef = React.useRef(isShiftActive);
  const isCheckingInRef = React.useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    isShiftActiveRef.current = isShiftActive;
  }, [isShiftActive]);

  const [tracker, setTracker] = useState<any>(null);
  const [locating, setLocating] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number, accuracy?: number, speed?: number} | null>(null);
  const [hasConsent, setHasConsent] = useState(true);
  const [assignedObjective, setAssignedObjective] = useState<any>(null);
  const [loadingObjective, setLoadingObjective] = useState(true);
  const [canSkipGps, setCanSkipGps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const locatingRef = React.useRef(locating);
  useEffect(() => { locatingRef.current = locating; }, [locating]);

  // REUSABLE CHECKIN LOGIC
  const performCheckin = async (coords: {lat: number, lng: number, accuracy: number}) => {
    if (isCheckingInRef.current || isSubmitting) return;
    
    isCheckingInRef.current = true;
    setIsSubmitting(true);
    const now = new Date();
    let serverShiftId = null;
    
    try {
      const res = await fetch('/api/shifts/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator_id: OPERATOR_ID,
          objective_id: assignedObjective?.id,
          latitude: coords.lat,
          longitude: coords.lng,
          accuracy: coords.accuracy
        })
      });
      
      if (!res.ok) throw new Error('Error en el servidor');
      
      const data = await res.json();
      if (data.shift?.id) serverShiftId = data.shift.id;
      if (data.warning) alert("⚠️ " + data.warning);
      
      startShift({ time: now, location: coords, operator_id: OPERATOR_ID }, serverShiftId);
      setLocating(false);
      setCanSkipGps(false);
    } catch (e) {
      console.error("Checkin error:", e);
      alert("No se pudo iniciar servicio. Intentá de nuevo.");
      isCheckingInRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getOperatorId = () => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('704_user') : null;
      if (stored) {
        const user = JSON.parse(stored);
        if (user.id) return user.id;
      }
    } catch (e) {}
    return 'recurso_demo';
  };

  const OPERATOR_ID = typeof window !== 'undefined' ? getOperatorId() : 'recurso_demo';

  useEffect(() => {
    try {
      const consent = localStorage.getItem('704_gps_consent');
      if (!consent) setHasConsent(false);
    } catch (e) {
      setHasConsent(false);
    }
    
    const fetchObjective = async () => {
      setLoadingObjective(true);
      try {
        const { data: res } = await supabase
          .from('resources')
          .select('*, objectives(*)')
          .eq('id', OPERATOR_ID)
          .single();
        
        if (res?.objectives) setAssignedObjective(res.objectives);
      } catch (e) {
        console.error("Error fetching objective:", e);
      } finally {
        setLoadingObjective(false);
      }
    };
    fetchObjective();
  }, []);

  useEffect(() => {
    // PASSIVE TRACKING: Get the user's location BEFORE they check-in so the map is accurate
    // instead of showing the distant fallback coordinate.
    let passiveWatchId: number;
    
    if (typeof window !== 'undefined' && navigator.geolocation && !isShiftActive) {
      passiveWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!isCheckingInRef.current && !isShiftActiveRef.current) {
            setLocation(prev => {
              // Only update if we don't have a high-accuracy active tracker running yet
              if (!tracker) {
                return {
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                  accuracy: pos.coords.accuracy,
                  speed: pos.coords.speed
                };
              }
              return prev;
            });
          }
        },
        () => {}, 
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    return () => {
      if (passiveWatchId) navigator.geolocation.clearWatch(passiveWatchId);
      if (tracker) tracker.stop();
    };
  }, [tracker, isShiftActive]);

  const handleClock = async () => {
    if (locating) return;
    setLocating(true);

    if (isShiftActive) {
      if (tracker) tracker.stop();
      try {
        await fetch('/api/shifts/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shift_id: shiftId,
            latitude: location?.lat,
            longitude: location?.lng
          })
        });
      } catch (e) {}
      endShift();
      setLocating(false);
      setGpsProgress({ accuracy: null, count: 0 });
      setCanSkipGps(false);
      return;
    }

    setGpsProgress({ accuracy: null, count: 0 });
    setCanSkipGps(false);

    // Set a safety timeout to allow skipping if GPS is too slow
    const skipTimer = setTimeout(() => {
       if (locatingRef.current) setCanSkipGps(true);
    }, 3500); // Reduced to 3.5s for snappy UX

    const gpsTimeout = setTimeout(() => {
      if (locatingRef.current && !isShiftActiveRef.current) {
        setLocating(false);
        isCheckingInRef.current = false;
        console.warn("GPS search timed out");
      }
    }, 45000); // Increased total timeout to 45s but user can skip earlier
    // Pre-warm geolocation to jumpstart the sensor
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(() => {}, () => {}, { enableHighAccuracy: true });
    }

    const { GPSTracker } = await import('@/lib/gps-tracker');
    const newTracker = new GPSTracker(
      async (pos) => {
        const coords = { 
          lat: pos.coords.latitude, 
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed
        };
        setGpsProgress(prev => ({ 
          accuracy: coords.accuracy, 
          count: prev.count + 1 
        }));

        // ACCURACY GATE: Wait for < 65m accuracy before auto-checking in
        const isAccurateEnough = coords.accuracy < 65;
        
        if (!isShiftActiveRef.current && !isCheckingInRef.current && isAccurateEnough) {
          performCheckin(coords);
          clearTimeout(gpsTimeout);
          clearTimeout(skipTimer);
        } else if (isShiftActiveRef.current) {
          // Regular tracking update
          setLocating(false); 
          clearTimeout(gpsTimeout);
          try {
            await fetch('/api/tracking/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                shiftData: { operator_id: OPERATOR_ID, id: shiftId },
                latitude: coords.lat,
                longitude: coords.lng,
                accuracy: pos.coords.accuracy
              })
            });
          } catch(e) {}
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        clearTimeout(gpsTimeout);
        clearTimeout(skipTimer);
        setLocating(false);
        isCheckingInRef.current = false;
        
        let errorMsg = "No pudimos acceder a tu ubicación. ";
        if (err.code === 1) { // PERMISSION_DENIED
          errorMsg += "Asegurate de haberle dado permisos de ubicación a tu navegador (Chrome/Safari) en la configuración de la app.";
        } else if (err.code === 2) { // POSITION_UNAVAILABLE
          errorMsg += "Asegurate de que el GPS (Ubicación) de tu celular esté ENCENDIDO.";
        } else if (err.code === 3) { // TIMEOUT
          errorMsg += "El sensor tardó demasiado en responder.";
        }
        alert("🔒 ACCESO A GPS BLOQUEADO\n\n" + errorMsg);
      },
      1000 // 1s interval for blazing fast updates
    );

    newTracker.start();
    setTracker(newTracker);
    // REMOVED: setLocating(false) - We now wait for the first fix or timeout
  };

  const destinations = assignedObjective ? [{
    id: assignedObjective.id,
    name: assignedObjective.name,
    position: [assignedObjective.latitude, assignedObjective.longitude] as [number, number]
  }] : [];

  return (
    <div className="relative h-screen bg-gray-50 flex flex-col">
      {!hasConsent && <GPSConsentModal onAccept={() => setHasConsent(true)} />}

      {/* Header Over Map */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 pointer-events-none">
        <div className="max-w-md mx-auto flex justify-between items-start">
          <Link href="/operador" className="pointer-events-auto">
            <button className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-100">
               <ArrowLeft size={20} className="text-gray-600" />
            </button>
          </Link>
          
          <div className="pointer-events-auto flex flex-col items-end gap-2">
            <div className={cn("bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm border border-gray-100 flex items-center gap-2")}>
              <div className={cn("w-2 h-2 rounded-full", isShiftActive ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
              <span className="text-[10px] font-black uppercase text-gray-700 tracking-tight">
                {isShiftActive ? 'Servicio Activo' : 'Fuera de Servicio'}
              </span>
            </div>

            {isShiftActive && location && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-3 border border-white/10"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-black uppercase text-white/50 leading-none">Transmitiendo GPS</span>
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                  </div>
                  <div className="flex flex-col mt-1 gap-0.5">
                    <span className="text-[9px] font-bold text-green-400">
                      {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                    </span>
                    <div className="flex items-center gap-2">
                       <span className={cn(
                         "text-[8px] font-black uppercase",
                         !location.accuracy || location.accuracy < 10 ? "text-green-400" : 
                         location.accuracy < 25 ? "text-amber-400" : "text-red-400"
                       )}>
                         Precisión: {location.accuracy ? `${Math.round(location.accuracy)}m` : '--'}
                       </span>
                       {location.speed !== null && (
                         <span className="text-[8px] font-medium text-white/40 uppercase">Vel: {Math.round(location.speed * 3.6)}km/h</span>
                       )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="flex-1 relative">
         <MobileLeaflet 
           currentPosition={location ? [location.lat, location.lng] : undefined}
           destinations={destinations}
         />
      </div>

      {/* Action Footer */}
      <div className="bg-white rounded-t-[2.5rem] shadow-2xl p-6 pb-28 relative z-10 border-t border-gray-100">
        <div className="max-w-md mx-auto space-y-6">
          
          {/* Objective Info Card */}
          <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-gray-100">
              <MapPin size={24} className={cn(assignedObjective ? "text-primary" : "text-gray-300")} />
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Puesto Actual</p>
               <p className="text-sm font-bold text-gray-900 truncate">
                 {loadingObjective ? 'Cargando...' : (assignedObjective?.name || 'Sin asignación')}
               </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              variant={isShiftActive ? "danger" : "success"}
              className="w-full h-16 text-lg font-black rounded-3xl shadow-xl transition-all active:scale-[0.98]"
              onClick={handleClock}
              disabled={locating}
            >
              {locating ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Certificando Ubicación...</span>
                </div>
              ) : isShiftActive ? (
                <>
                  <LogOut size={24} className="mr-2" />
                  Finalizar Turno
                </>
              ) : (
                <>
                  <LogIn size={24} className="mr-2" />
                  Iniciar Servicio
                </>
              )}
            </Button>
            
            <p className="text-[10px] text-center text-gray-400 font-medium px-4">
              Al fichar, tu ubicación GPS será certificada conforme a los protocolos de seguridad de 704.
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced GPS Status Overlay */}
      <AnimatePresence>
        {locating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="relative mb-12">
              <div className="w-32 h-32 border-4 border-primary/20 rounded-full animate-pulse" />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-t-4 border-primary rounded-full shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)]"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                 <Navigation className="w-12 h-12 text-primary animate-bounce fill-primary/20" />
              </div>
            </div>
            
            <h2 className="text-2xl font-black text-white uppercase tracking-[0.2em] mb-4">Certificando Ubicación</h2>
            
            <div className="space-y-1 mb-8">
              <p className="text-primary text-sm font-black uppercase tracking-widest">
                {gpsProgress.accuracy 
                  ? `Precisión Actual: ${Math.round(gpsProgress.accuracy)}m`
                  : "Buscando Satélites..."}
              </p>
              <p className="text-white/40 text-[9px] font-bold uppercase tracking-tighter">
                {gpsProgress.accuracy && gpsProgress.accuracy > 50 
                  ? "Señal débil (posiblemente estés en interiores o con WiFi)" 
                  : "Requerido: Menos de 50 metros para máxima seguridad"}
              </p>
            </div>

            <div className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden mb-12 relative shadow-inner">
              <motion.div 
                 className="h-full bg-gradient-to-r from-primary/50 to-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.8)]"
                 initial={{ width: "10%" }}
                 animate={{ width: gpsProgress.accuracy ? `${Math.min(100, Math.max(10, 100 - (gpsProgress.accuracy - 50)))}%` : "30%" }}
              />
            </div>

            <AnimatePresence>
              {canSkipGps && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <p className="text-[10px] text-white/40 uppercase font-black px-10 leading-relaxed italic">
                    Estamos teniendo problemas para obtener tu posición exacta. Podés continuar con señal baja, pero la precisión del reporte será menor.
                  </p>
                  <Button 
                    variant="outline" 
                    className="border-white/20 text-white tracking-[0.3em] font-black uppercase text-xs h-14 px-10 hover:bg-white/10"
                    onClick={() => {
                      const coords = location || { lat: -31.6350, lng: -60.7000, accuracy: 100 };
                      performCheckin(coords as any);
                    }}
                  >
                    Iniciar con Señal Baja
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={() => {
                setLocating(false);
                isCheckingInRef.current = false;
              }}
              className="absolute top-10 right-10 text-white/30 hover:text-white transition-colors"
            >
              <X size={32} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
