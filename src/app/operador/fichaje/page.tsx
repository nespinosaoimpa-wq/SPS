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
  const { isShiftActive, shiftId, startShift, endShift, theme } = useShift();
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
  
  // Handoff state
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [objectiveItems, setObjectiveItems] = useState<any[]>([]);
  const [itemConditions, setItemConditions] = useState<Record<string, string>>({});
  
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
          email: user?.email,
          objective_id: assignedObjective?.id,
          latitude: coords.lat,
          longitude: coords.lng,
          accuracy: coords.accuracy
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
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
  
  const OPERATOR_ID = user?.id || 'recurso_demo';

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

  // AUTO-RESTART TRACKER
  useEffect(() => {
    let activeTracker: any = null;
    if (isShiftActive && !tracker && typeof window !== 'undefined') {
      const startActiveTracking = async () => {
        const { GPSTracker } = await import('@/lib/gps-tracker');
        activeTracker = new GPSTracker(
          async (pos) => {
            // SAFETY: Only transmit if shift is still active in the ref
            if (!isShiftActiveRef.current) {
              if (activeTracker) activeTracker.stop();
              return;
            }

            const coords = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              speed: pos.coords.speed
            };
            setLocation(coords);
            try {
              let resolvedOpId = OPERATOR_ID;
              try {
                const saved = localStorage.getItem('704_active_shift');
                if (saved) {
                  const parsed = JSON.parse(saved);
                  resolvedOpId = parsed.data?.operator_id || OPERATOR_ID;
                }
              } catch(e) {}
              await fetch('/api/tracking/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  shiftData: { operator_id: resolvedOpId, id: shiftId },
                  latitude: coords.lat,
                  longitude: coords.lng,
                  accuracy: pos.coords.accuracy,
                  speed: pos.coords.speed,
                  heading: pos.coords.heading
                })
              });
            } catch(e) {}
          },
          (err) => console.warn('[GPS Passive Restart] Error:', err.message),
          1000
        );
        activeTracker.start();
        setTracker(activeTracker);
      };
      startActiveTracking();
    }
    return () => {
      if (activeTracker) activeTracker.stop();
    };
  }, [isShiftActive]);

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
          try {
            let resolvedOpId = OPERATOR_ID;
            try {
              const saved = localStorage.getItem('704_active_shift');
              if (saved) {
                const parsed = JSON.parse(saved);
                resolvedOpId = parsed.data?.operator_id || OPERATOR_ID;
              }
            } catch(e) {}

            await fetch('/api/tracking/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                shiftData: { operator_id: resolvedOpId, id: shiftId },
                latitude: coords.lat,
                longitude: coords.lng,
                accuracy: pos.coords.accuracy,
                speed: pos.coords.speed,
                heading: pos.coords.heading
              })
            });
          } catch(e) {}
        }
      },
      (err) => {
        setLocating(false);
        isCheckingInRef.current = false;
        alert("🔒 ACCESO A GPS BLOQUEADO");
      },
      1000
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

  const destinations = assignedObjective ? [{
    id: assignedObjective.id,
    name: assignedObjective.name,
    position: [assignedObjective.latitude, assignedObjective.longitude] as [number, number]
  }] : [];

  let displayLocation = location ? [location.lat, location.lng] : undefined;
  const currentAvatar = isShiftActive ? ((shiftData as any)?.avatar_url || avatarUrl) : avatarUrl;

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
               "backdrop-blur-2xl px-5 py-2.5 rounded-3xl shadow-xl border flex items-center gap-3 transition-all",
               isShiftActive 
                ? (theme === 'dark' ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-100")
                : (theme === 'dark' ? "bg-white/5 border-white/5" : "bg-white border-gray-100")
             )}>
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full", 
                  isShiftActive ? "bg-blue-500 animate-pulse" : "bg-gray-400"
                )} />
                <span className={cn(
                  "text-[11px] font-black uppercase tracking-widest",
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
           destinations={destinations}
           avatarUrl={currentAvatar}
           showFloatingOverlay={false}
         />
      </div>

      {/* BOTTOM SHEET: GeoZilla Style Rounded Card */}
      <div className={cn(
        "relative z-10 p-8 pb-12 rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] border-t",
        theme === 'dark' ? "bg-[#111] border-white/5" : "bg-white border-gray-100"
      )}>
        <div className="max-w-md mx-auto space-y-8">
          
          {/* Objective Info: Clean and Elegant */}
          <div className="flex items-center gap-5">
            <div className={cn(
              "w-16 h-16 rounded-[1.5rem] shadow-inner flex items-center justify-center transition-all",
              theme === 'dark' ? "bg-white/5" : "bg-blue-50"
            )}>
              <MapPin size={30} className={cn(assignedObjective ? "text-blue-500" : "text-gray-300")} />
            </div>
            <div className="flex-1 min-w-0">
               <p className={cn("text-[10px] font-black uppercase tracking-[0.2em] mb-1", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>Puesto de Control</p>
               <h3 className={cn("text-xl font-black truncate tracking-tight", theme === 'dark' ? "text-white" : "text-gray-900")}>
                 {loadingObjective ? 'Localizando...' : (assignedObjective?.name || 'Buscando Objetivo')}
               </h3>
               {assignedObjective?.address && (
                 <p className="text-xs font-medium text-gray-500 truncate mt-0.5">{assignedObjective.address}</p>
               )}
            </div>
          </div>

          {/* MAIN ACTION BUTTON: Large, Circular, Floating Feel */}
          <div className="flex flex-col items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClockClick}
              disabled={locating || isSubmitting}
              className={cn(
                "w-full h-20 rounded-[2rem] flex items-center justify-center gap-4 text-sm font-black uppercase tracking-[0.2em] shadow-2xl transition-all",
                isShiftActive 
                  ? "bg-red-500 text-white shadow-red-500/20" 
                  : "bg-blue-600 text-white shadow-blue-600/20"
              )}
            >
              {locating ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sincronizando...</span>
                </div>
              ) : isShiftActive ? (
                <>
                  <LogOut size={24} />
                  Finalizar Turno
                </>
              ) : (
                <>
                  <LogIn size={24} />
                  Iniciar Turno
                </>
              )}
            </motion.button>
            
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-tight">
               <ShieldCheck size={12} className="text-green-500" />
               Rastreo Seguro de 704 OS
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
            <div className="bg-white/10 border border-white/10 p-10 rounded-[3rem] shadow-2xl max-w-sm w-full">
                <div className="relative mb-10 mx-auto w-24 h-24">
                  <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-t-4 border-blue-500 rounded-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                     <Navigation className="w-8 h-8 text-blue-500 animate-pulse" />
                  </div>
                </div>
                
                <h2 className="text-xl font-black text-white uppercase tracking-widest mb-3">Certificando GPS</h2>
                <p className="text-white/60 text-[11px] font-medium leading-relaxed mb-8 px-4">
                  Estamos validando tu posición exacta para autorizar el inicio de servicio.
                </p>

                {gpsProgress.accuracy && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5 mb-8">
                     <div className="w-2 h-2 rounded-full bg-green-500" />
                     <span className="text-[10px] font-black text-white uppercase">Precisión: {Math.round(gpsProgress.accuracy)}m</span>
                  </div>
                )}

                {canSkipGps && (
                  <Button 
                    variant="outline" 
                    className="w-full h-14 border-white/20 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl"
                    onClick={() => performCheckin(assignedObjective ? {lat: assignedObjective.latitude, lng: assignedObjective.longitude, accuracy: 10} : (location as any || {lat:0,lng:0,accuracy:100}))}
                  >
                    Iniciar de todas formas
                  </Button>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              "w-full max-h-[85vh] rounded-t-[3.5rem] shadow-2xl p-8 pb-12 overflow-y-auto",
              theme === 'dark' ? "bg-[#121212]" : "bg-white"
            )}>
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className={cn("text-2xl font-black tracking-tight", theme === 'dark' ? "text-white" : "text-gray-900")}>Reporte Final</h2>
                  <p className="text-xs font-bold text-gray-500 uppercase mt-1 tracking-widest">Control de Inventario</p>
                </div>
                <button onClick={() => setShowHandoffModal(false)} className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all", theme === 'dark' ? "bg-white/5 text-white" : "bg-gray-100 text-gray-400")}>
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 mb-10">
                {objectiveItems.length === 0 ? (
                  <div className="p-10 text-center bg-gray-50 dark:bg-white/5 rounded-3xl">
                     <CheckSquare size={40} className="text-blue-500 mx-auto mb-4 opacity-50" />
                     <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Sin elementos asignados</p>
                  </div>
                ) : objectiveItems.map((item) => (
                  <div key={item.id} className={cn("p-6 rounded-[2rem] border transition-all", theme === 'dark' ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100")}>
                    <div className="flex justify-between items-center mb-5">
                      <div>
                        <p className={cn("text-sm font-black uppercase", theme === 'dark' ? "text-white" : "text-gray-800")}>{item.name}</p>
                        <p className="text-[10px] text-gray-500 font-bold mt-0.5">ID: {item.serial_number || 'S/N'}</p>
                      </div>
                      <Package size={20} className="text-blue-500 opacity-50" />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {['operativo', 'roto', 'faltante'].map((cond) => (
                        <button 
                          key={cond}
                          onClick={() => setItemConditions(prev => ({...prev, [item.id]: cond}))}
                          className={cn(
                            "py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                            itemConditions[item.id] === cond 
                              ? (cond === 'operativo' ? "bg-green-500 text-black shadow-lg shadow-green-500/20" : 
                                 cond === 'roto' ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : 
                                 "bg-amber-500 text-white shadow-lg shadow-amber-500/20")
                              : (theme === 'dark' ? "bg-black/40 text-gray-500 border border-white/5" : "bg-white text-gray-400 border border-gray-100")
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
                variant="primary" 
                className="w-full h-18 rounded-[2rem] text-sm font-black tracking-widest uppercase shadow-2xl bg-blue-600"
                onClick={submitHandoffAndCheckout}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Enviando...' : 'Finalizar y Salir'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
