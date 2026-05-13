'use client';

import React, { useState, useEffect } from 'react';
import { 
  MapPin, LogIn, LogOut, Navigation, 
  ShieldCheck, AlertCircle, ArrowLeft, X, CheckSquare, Package, Camera, Smartphone, Zap, Shield, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import dynamic from 'next/dynamic';

import { useShift } from '@/components/providers/ShiftProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import GPSConsentModal from '@/components/legal/GPSConsentModal';

const MobileLeaflet = dynamic(() => import('@/components/operador/MobileLeaflet'), { ssr: false });

export default function FichajePage() {
  const { user, loading: authLoading } = useAuth();
  const { isShiftActive, shiftId, shiftData, startShift, endShift, theme, updateShiftData } = useShift();
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loadingObjective, setLoadingObjective] = useState(true);
  const [gpsProgress, setGpsProgress] = useState<{accuracy: number | null, count: number}>({ accuracy: null, count: 0 });
  const [canSkipGps, setCanSkipGps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [geofenceError, setGeofenceError] = useState<{message: string, targetRadius: number} | null>(null);
  
  // Handoff state
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [objectiveItems, setObjectiveItems] = useState<any[]>([]);
  const [itemConditions, setItemConditions] = useState<Record<string, string>>({});
  
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState({
    accuracy: null as number | null,
    distanceToTarget: null as number | null,
    syncStatus: 'online' as 'online' | 'offline' | 'pending',
    lastPointTimestamp: null as number | null
  });
  const locatingRef = React.useRef(locating);
  useEffect(() => { locatingRef.current = locating; }, [locating]);

  // ─── AUTH & IDENTITY ───
  const OPERATOR_ID = user?.id || 'recurso_demo';

  // REUSABLE CHECKIN LOGIC
  const performCheckin = async (coords: {lat: number, lng: number, accuracy: number}) => {
    if (isCheckingInRef.current || isSubmitting) return;
    
    isCheckingInRef.current = true;
    setIsSubmitting(true);
    const now = new Date();
    let serverShiftId = null;
    
    try {
      setGeofenceError(null);
      const res = await fetch('/api/shifts/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator_id: OPERATOR_ID,
          email: user?.email,
          objective_id: assignedObjective?.id,
          latitude: coords.lat,
          longitude: coords.lng,
          accuracy: coords.accuracy
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 403 && errorData.error === 'FUERA DE RANGO') {
          setGeofenceError({
            message: errorData.message,
            targetRadius: errorData.targetRadius
          });
          setLocating(false);
          return;
        }
        throw new Error(errorData.error || 'Error en el servidor');
      }
      
      const data = await res.json();
      if (data.shift?.id) serverShiftId = data.shift.id;
      if (data.warning) alert("⚠️ " + data.warning);
      
      startShift({ 
        time: now, 
        location: coords, 
        operator_id: data.resource_id || OPERATOR_ID, 
        objective_id: assignedObjective?.id,
        objectiveLocation: data.objectiveLocation,
        geofenceRadius: data.geofenceRadius,
        avatar_url: avatarUrl // Include avatar
      }, serverShiftId);
      
      setLocating(false);
      setCanSkipGps(false);
    } catch (e: any) {
      console.error("Checkin error:", e);
      alert(e.message || "No se pudo iniciar servicio. Intentá de nuevo.");
      isCheckingInRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };
  
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
        if (OPERATOR_ID !== 'recurso_demo' || user?.email) {
          const params = new URLSearchParams();
          if (OPERATOR_ID !== 'recurso_demo') params.append('id', OPERATOR_ID);
          if (user?.email) params.append('email', user.email || '');

          const response = await fetch(`/api/resources/profile?${params.toString()}`);
          const res = await response.json();
          
          if (res && !res.error) {
            if (res.avatar_url) setAvatarUrl(res.avatar_url);
            
            if (res.objectives) {
              setAssignedObjective(Array.isArray(res.objectives) ? res.objectives[0] : res.objectives);
            } else if (res.current_objective_id) {
               setAssignedObjective(res.objectives);
            }
          }
        }
      } catch (e) {
        console.error("Error fetching profile:", e);
      } finally {
        setLoadingObjective(false);
      }
    };
    fetchObjective();

    // Start watching position immediately to show the marker correctly on the map
    let watchId: number | null = null;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          // Strict gate for initial UI to avoid "jumping" to cell towers
          if (pos.coords.accuracy > 150 && location) return; 
          
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed || 0
          });
        },
        (err) => console.warn('[Fichaje] GPS Initial Watch Error:', err.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [user]);

  useEffect(() => {
    const checkActiveShift = async () => {
      if (!user || isShiftActive) return;
      
      try {
        const { data: resource } = await supabase
          .from('resources')
          .select('id')
          .eq('assigned_to', user.id)
          .maybeSingle();
          
        let query = supabase
          .from('guard_shifts')
          .select('*')
          .in('status', ['activo', 'active']);
          
        if (resource?.id) {
          const isResourceUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resource.id);
          let orClause = `operator_id.eq.${user.id}`;
          if (isResourceUUID) {
            orClause += `,operator_id.eq.${resource.id}`;
          } else {
            orClause += `,operator_id.eq."${resource.id}"`;
          }
          query = query.or(orClause);
        } else {
          query = query.eq('operator_id', user.id);
        }
        
        const { data: activeShift, error } = await query.maybeSingle();
          
        if (activeShift && !error) {
          startShift({
            time: new Date(activeShift.checkin_time),
            location: { lat: activeShift.checkin_latitude, lng: activeShift.checkin_longitude },
            operator_id: activeShift.operator_id,
            objective_id: activeShift.objective_id
          }, activeShift.id);
        }
      } catch (e) {
        console.error("Error checking active shift:", e);
      }
    };
    
    checkActiveShift();
  }, [user, isShiftActive]);

  // Passive location sync for UI
  useEffect(() => {
    if (isShiftActive && shiftData?.location) {
      setLocation(shiftData.location);
    }
  }, [isShiftActive, shiftData?.location]);

  const handleClockClick = () => {
    if (locating) return;
    if (isShiftActive && assignedObjective?.id) {
      fetchObjectiveItems();
      setShowHandoffModal(true);
    } else {
      handleClock();
    }
  };

  const handleClock = async () => {
    setLocating(true);

    if (isShiftActive) {
      if (tracker) {
        tracker.stop();
        setTracker(null);
      }
      try {
        const res = await fetch('/api/shifts/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shift_id: shiftId,
            latitude: location?.lat,
            longitude: location?.lng
          })
        });
        
        if (!res.ok) throw new Error('Error al finalizar turno');
      } catch (e: any) {
        console.error("Checkout error:", e);
        alert(e.message || "Error al finalizar turno.");
        setLocating(false);
        return;
      }
      endShift();
      setLocating(false);
      setGpsProgress({ accuracy: null, count: 0 });
      setCanSkipGps(false);
      return;
    }

    setGpsProgress({ accuracy: null, count: 0 });
    setCanSkipGps(false);

    const skipTimer = setTimeout(() => {
       if (locatingRef.current) setCanSkipGps(true);
    }, 4000); 

    const gpsTimeout = setTimeout(() => {
      if (locatingRef.current && !isShiftActiveRef.current) {
        setLocating(false);
        isCheckingInRef.current = false;
      }
    }, 45000); 

    const { GPSTracker } = await import('@/lib/gps-tracker');
    const newTracker = new GPSTracker(
      shiftId || 'pending_validation',
      OPERATOR_ID,
      async (pos) => {
        const coords = { 
          lat: pos.latitude, 
          lng: pos.longitude,
          accuracy: pos.accuracy,
          speed: pos.speed
        };
        setGpsProgress(prev => ({ 
          accuracy: coords.accuracy, 
          count: prev.count + 1 
        }));

        const isAccurateEnough = coords.accuracy < 100;
        
        if (!isShiftActiveRef.current && !isCheckingInRef.current && isAccurateEnough) {
          performCheckin(coords);
          clearTimeout(gpsTimeout);
          clearTimeout(skipTimer);
        } else if (isShiftActiveRef.current) {
        if (!isShiftActiveRef.current) return;
        setLocation(coords);
        setLocating(false); 
        clearTimeout(gpsTimeout);
        
        // Update Telemetry
        setTelemetry({
          accuracy: pos.accuracy,
          distanceToTarget: pos.distanceToObjective,
          syncStatus: navigator.onLine ? 'online' : 'offline',
          lastPointTimestamp: Date.now()
        });
        }
      },
      (err) => {
        setLocating(false);
        isCheckingInRef.current = false;
        alert("🔒 ACCESO A GPS BLOQUEADO");
      },
      assignedObjective ? {
        location: { lat: assignedObjective.latitude, lng: assignedObjective.longitude },
        radius: assignedObjective.geofence_radius_meters || 70,
        id: assignedObjective.id
      } : undefined
    );

    newTracker.start();
    setTracker(newTracker);
  };

  const fetchObjectiveItems = async () => {
    if (!assignedObjective?.id) return;
    try {
      const { data } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('assigned_to_objective', assignedObjective.id)
        .neq('condition', 'baja');
      setObjectiveItems(data || []);
      const initial: Record<string, string> = {};
      data?.forEach(item => initial[item.id] = 'operativo');
      setItemConditions(initial);
    } catch (e) {
      console.error(e);
    }
  };

  const submitHandoffAndCheckout = async () => {
    try {
      setIsSubmitting(true);
      if (objectiveItems.length > 0) {
        const items = objectiveItems.map(item => ({
          item_id: item.id,
          name: item.name,
          condition: itemConditions[item.id] || 'operativo',
        }));
        await fetch('/api/inventory/handoff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            objective_id: assignedObjective.id,
            resource_id: OPERATOR_ID,
            shift_id: shiftId,
            items
          })
        });
      }
      setShowHandoffModal(false);
      await handleClock();
    } catch (e: any) {
      alert("Error al enviar el reporte.");
      setIsSubmitting(false);
    }
  };

  const destinations = (assignedObjective && typeof assignedObjective.latitude === 'number' && typeof assignedObjective.longitude === 'number') 
    ? [{
        id: assignedObjective.id,
        name: assignedObjective.name,
        position: [assignedObjective.latitude, assignedObjective.longitude] as [number, number]
      }] 
    : [];

  let displayLocation = location ? [location.lat, location.lng] : undefined;
  let displayAccuracy = location?.accuracy;
  const currentAvatar = isShiftActive ? ((shiftData as any)?.avatar_url || avatarUrl) : avatarUrl;

  if (globalError) {
    return (
      <div className={cn("min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-6", theme === 'dark' ? "bg-black text-white" : "bg-[#f8f9fc] text-gray-900")}>
        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center border border-red-500/20 shadow-2xl">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase tracking-tight">Error de Sistema</h2>
          <p className="text-sm text-gray-500 font-medium max-w-xs mx-auto leading-relaxed">{globalError}</p>
        </div>
        <Button onClick={() => window.location.reload()} className="h-14 px-8 uppercase font-black text-[10px] tracking-widest rounded-xl bg-blue-600 hover:bg-blue-700">
          Reiniciar Aplicación
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative h-screen flex flex-col transition-colors duration-500",
      theme === 'dark' ? "bg-black" : "bg-[#f8f9fc]"
    )}>
      {!hasConsent && <GPSConsentModal onAccept={() => setHasConsent(true)} />}

      {/* HEADER: GeoZilla Style Glassmorphism */}
      <div className="absolute top-0 left-0 right-0 z-20 p-6 pointer-events-none">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <Link href="/operador" className="pointer-events-auto">
            <motion.button 
              whileTap={{ scale: 0.9 }}
              className={cn(
                "w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center backdrop-blur-xl border transition-all",
                theme === 'dark' ? "bg-white/10 border-white/10 text-white" : "bg-white/90 border-white text-gray-800"
              )}
            >
               <ArrowLeft size={22} />
            </motion.button>
          </Link>
             <div className="pointer-events-auto">
             <div className={cn(
               "tactical-glass px-5 py-2.5 rounded-[1.5rem] flex items-center gap-3 transition-all",
               isShiftActive 
                ? (theme === 'dark' ? "border-blue-500/30" : "bg-blue-50 border-blue-100")
                : "border-white/10"
             )}>
                <div className="status-dot bg-blue-500" />
                <span className={cn(
                   "text-[10px] text-premium tracking-[0.2em]",
                   isShiftActive 
                    ? (theme === 'dark' ? "text-blue-400" : "text-blue-600")
                    : (theme === 'dark' ? "text-gray-500" : "text-gray-400")
                )}>
                  {isShiftActive ? 'En Servicio' : 'Fuera de Turno'}
                </span>
             </div>
          </div>
        </div>
      </div>

      {/* MAP: Full Screen */}
      <div className="flex-1 relative z-0">
          <MobileLeaflet 
            currentPosition={displayLocation as [number, number] | undefined}
            currentAccuracy={displayAccuracy}
            destinations={destinations}
            avatarUrl={currentAvatar}
            showFloatingOverlay={false}
          />
      </div>

      {/* BOTTOM SHEET: GeoZilla Style Rounded Card */}
      <div className={cn(
        "relative z-10 p-8 pb-12 rounded-t-[4rem] shadow-tactical border-t",
        theme === 'dark' ? "bg-[#0a0a0a] border-white/5" : "bg-white border-gray-100"
      )}>
        <div className="max-w-md mx-auto space-y-8">
          
          {/* Objective Info: Clean and Elegant */}
          <div className="flex items-center gap-5">
            <div className={cn(
              "w-20 h-20 rounded-[2rem] shadow-inner flex items-center justify-center transition-all",
              theme === 'dark' ? "bg-white/5" : "bg-blue-50"
            )}>
              <MapPin size={36} className={cn(assignedObjective ? "text-blue-600" : "text-gray-300")} />
            </div>
            <div className="flex-1 min-w-0">
               <p className={cn("text-[10px] text-premium tracking-[0.25em] mb-1 text-blue-600 opacity-60")}>Puesto de Control</p>
               <h3 className={cn("text-2xl text-premium tracking-tight leading-none", theme === 'dark' ? "text-white" : "text-gray-900")}>
                 {loadingObjective ? 'Localizando...' : (assignedObjective?.name || 'Buscando Objetivo')}
               </h3>
               {assignedObjective?.address && (
                 <p className="text-[11px] font-bold text-gray-400 truncate mt-2 uppercase tracking-wide">{assignedObjective.address}</p>
               )}
            </div>
          </div>

          {/* MAIN ACTION BUTTON: Large, Circular, Floating Feel */}
          <div className="flex flex-col items-center gap-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClockClick}
              disabled={locating || isSubmitting}
              className={cn(
                "w-full h-24 rounded-[2.5rem] flex items-center justify-center gap-4 text-[13px] text-premium tracking-[0.4em] shadow-2xl transition-all border-none",
                isShiftActive 
                  ? "bg-red-500 text-white shadow-red-500/20" 
                  : "btn-premium text-white"
              )}
            >
              {locating ? (
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sincronizando...</span>
                </div>
              ) : isShiftActive ? (
                <>
                  <LogOut size={28} />
                  Finalizar Turno
                </>
              ) : (
                <>
                  <LogIn size={28} />
                  Iniciar Turno
                </>
              )}
            </motion.button>
            
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-3 py-2 px-4 rounded-full bg-gray-100 dark:bg-white/5">
                 <ShieldCheck size={14} className="text-green-500" />
                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Safe Tracking: 704 OS Tactical</span>
              </div>
              {location?.accuracy && (
                <div className="flex items-center gap-2">
                   <div className={cn(
                     "w-1.5 h-1.5 rounded-full animate-pulse",
                     location.accuracy <= 15 ? "bg-green-500" : location.accuracy <= 50 ? "bg-amber-500" : "bg-red-500"
                   )} />
                   <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                     Precisión: {Math.round(location.accuracy)}m
                   </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* STATUS OVERLAY: Extreme Glassmorphism */}
      <AnimatePresence>
        {locating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="tactical-glass p-12 rounded-[4rem] max-w-sm w-full">
                <div className="relative mb-12 mx-auto w-28 h-28">
                  <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full" />
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-t-4 border-blue-500 rounded-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                     <div className="relative">
                        <Navigation className="w-10 h-10 text-blue-500" />
                        <div className="absolute -inset-2 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
                     </div>
                  </div>
                </div>
                
                <h2 className="text-2xl text-premium text-white mb-3">Certificando GPS</h2>
                <p className="text-white/50 text-[12px] font-bold uppercase tracking-wider leading-relaxed mb-10 px-4">
                  Validando coordenadas tácticas de alta precisión.
                </p>

                {gpsProgress.accuracy && (
                  <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-10">
                     <div className="status-dot bg-blue-500" />
                     <span className="text-[11px] text-premium text-blue-400">Precisión: {Math.round(gpsProgress.accuracy)}m</span>
                  </div>
                )}

                {canSkipGps && (
                  <Button 
                    variant="outline" 
                    className="w-full h-16 border-white/10 bg-white/5 text-white text-premium text-[11px] tracking-widest rounded-2xl hover:bg-white/10"
                    onClick={() => performCheckin(assignedObjective ? {lat: assignedObjective.latitude, lng: assignedObjective.longitude, accuracy: 10} : (location as any || {lat:0,lng:0,accuracy:100}))}
                  >
                    Omitir y Conectar
                  </Button>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GEOFENCE BLOCK OVERLAY */}
      {geofenceError && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
        >
          <div className="bg-zinc-900 border border-red-500/20 p-10 rounded-[3.5rem] max-w-sm w-full shadow-2xl shadow-red-500/10">
              <div className="w-24 h-24 bg-red-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                <AlertTriangle size={48} className="text-red-500 animate-pulse" />
              </div>
              
              <h2 className="text-3xl text-premium text-white mb-4 italic uppercase">Fuera de Rango</h2>
              <p className="text-gray-400 text-[13px] leading-relaxed mb-10">
                {geofenceError.message}
              </p>

              <div className="space-y-4">
                <Button 
                  className="w-full h-18 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[11px] hover:bg-gray-200"
                  onClick={() => {
                    setGeofenceError(null);
                    handleClock();
                  }}
                >
                  Reintentar (GPS Alta Precisión)
                </Button>
                
                <Button 
                  variant="outline"
                  className="w-full h-18 rounded-2xl border-white/10 text-gray-500 font-black uppercase tracking-widest text-[11px] hover:bg-white/5"
                  onClick={() => setGeofenceError(null)}
                >
                  Volver al Mapa
                </Button>
              </div>
              
              <p className="mt-8 text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">
                Seguridad Certificada 704
              </p>
          </div>
        </motion.div>
      )}

      {/* HANDOFF MODAL: GeoZilla Style Dark Sheet */}
      <AnimatePresence>
        {showHandoffModal && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end"
          >
            <div className={cn(
              "w-full max-h-[85vh] rounded-t-[4rem] shadow-tactical p-10 pb-16 overflow-y-auto",
              theme === 'dark' ? "bg-[#0a0a0a]" : "bg-white"
            )}>
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className={cn("text-3xl text-premium tracking-tight", theme === 'dark' ? "text-white" : "text-gray-900")}>Reporte Final</h2>
                  <p className="text-[10px] text-blue-600 font-black uppercase mt-2 tracking-[0.2em] opacity-60">Control de Inventario Operativo</p>
                </div>
                <button onClick={() => setShowHandoffModal(false)} className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all", theme === 'dark' ? "bg-white/5 text-white" : "bg-gray-100 text-gray-400")}>
                  <X size={28} />
                </button>
              </div>

              <div className="space-y-6 mb-12">
                {objectiveItems.length === 0 ? (
                  <div className="p-16 text-center bg-gray-50 dark:bg-white/5 rounded-[3rem] border border-dashed border-gray-200 dark:border-white/5">
                     <CheckSquare size={48} className="text-blue-500 mx-auto mb-6 opacity-30" />
                     <p className="text-xs text-premium text-gray-500 tracking-widest">Sin elementos asignados</p>
                  </div>
                ) : objectiveItems.map((item) => (
                  <div key={item.id} className={cn("p-8 rounded-[2.5rem] border transition-all", theme === 'dark' ? "bg-zinc-900/40 border-white/5" : "bg-gray-50 border-gray-100")}>
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <p className={cn("text-lg text-premium", theme === 'dark' ? "text-white" : "text-gray-800")}>{item.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">SN: {item.serial_number || 'REG-704-AUTO'}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Package size={22} className="text-blue-500" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      {['operativo', 'roto', 'faltante'].map((cond) => (
                        <button 
                          key={cond}
                          onClick={() => setItemConditions(prev => ({...prev, [item.id]: cond}))}
                          className={cn(
                            "py-4 rounded-2xl text-[10px] text-premium tracking-widest transition-all",
                            itemConditions[item.id] === cond 
                              ? (cond === 'operativo' ? "bg-green-500 text-black shadow-lg shadow-green-500/20" : 
                                 cond === 'roto' ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : 
                                 "bg-amber-500 text-white shadow-lg shadow-amber-500/20")
                              : (theme === 'dark' ? "bg-white/5 text-gray-500 border border-white/5" : "bg-white text-gray-400 border border-gray-100")
                          )}
                        >
                          {cond}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Button 
                className="w-full h-20 rounded-[2rem] text-[12px] text-premium tracking-[0.3em] shadow-2xl btn-premium border-none"
                onClick={submitHandoffAndCheckout}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Procesando...' : 'Finalizar y Salir'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <DebugTelemetry 
        accuracy={telemetry.accuracy}
        distanceToTarget={telemetry.distanceToTarget}
        syncStatus={telemetry.syncStatus}
        lastPointTimestamp={telemetry.lastPointTimestamp}
        isVisible={!!shiftId}
      />
    </div>
  );
}
