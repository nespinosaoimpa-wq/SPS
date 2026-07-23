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
import { DocumentScanner } from '@/components/operador/DocumentScanner';

const MobileLeaflet = dynamic(() => import('@/components/operador/MobileLeaflet'), { ssr: false });
import DynamicIsland from '@/components/operador/DynamicIsland';
import { TacticalSheet } from '@/components/ui/TacticalSheet';

function getItemDisplayName(item: any): string {
  if (!item) return 'Elemento de Servicio';

  const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  
  let name = item.item_name || item.name || item.description || '';
  if (name && !isUuid(name)) {
    return name;
  }

  const categoryMap: Record<string, { label: string; icon: string }> = {
    linterna: { label: 'Linterna Táctica', icon: '🔦' },
    radio: { label: 'Radio / Handy VHF', icon: '📻' },
    celular: { label: 'Celular de Guardia', icon: '📱' },
    vehiculo: { label: 'Vehículo / Patrullero', icon: '🚘' },
    llaves: { label: 'Manojo de Llaves', icon: '🔑' },
    chaleco: { label: 'Chaleco Antibalas', icon: '🦺' },
    casco: { label: 'Casco de Protección', icon: '🪖' },
    arma: { label: 'Armamento de Servicio', icon: '🛡️' },
    computadora: { label: 'Equipo de Cómputo / Tablet', icon: '💻' },
  };

  const catKey = (item.category || '').toLowerCase();
  const catInfo = categoryMap[catKey] || { label: 'Activo de Servicio', icon: '📦' };

  if (item.serial_number && !isUuid(item.serial_number)) {
    return `${catInfo.icon} ${catInfo.label} (${item.serial_number})`;
  }

  return `${catInfo.icon} ${catInfo.label}`;
}

export default function FichajePage() {
  const { user, loading: authLoading } = useAuth();
  const { isShiftActive, shiftId, shiftData, startShift, endShift, theme, updateShiftData, setHighFrequencyMode } = useShift();
  const isShiftActiveRef = React.useRef(isShiftActive);
  const isCheckingInRef = React.useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    isShiftActiveRef.current = isShiftActive;
  }, [isShiftActive]);

  const [tracker, setTracker] = useState<any>(null);
  const checkinTrackerRef = React.useRef<any>(null);
  const [locating, setLocating] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number, accuracy?: number, speed?: number} | null>(null);
  const [hasConsent, setHasConsent] = useState(true);
  const [showInventoryCheck, setShowInventoryCheck] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [inventoryStatus, setInventoryStatus] = useState<Record<string, string>>({});
  const [showScanner, setShowScanner] = useState(false);
  const [assignedObjective, setAssignedObjective] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loadingObjective, setLoadingObjective] = useState(true);
  const [gpsProgress, setGpsProgress] = useState<{accuracy: number | null, count: number}>({ accuracy: null, count: 0 });
  const [canSkipGps, setCanSkipGps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [geofenceError, setGeofenceError] = useState<{message: string, targetRadius: number} | null>(null);
  
  // Handoff state
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [loadingHandoff, setLoadingHandoff] = useState(false);
  const [handoffNotes, setHandoffNotes] = useState('');
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

  // ─── PANIC BUTTON LOGIC ───
  const [panicProgress, setPanicProgress] = useState(0);
  const panicTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const panicIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const handlePanicStart = () => {
    setPanicProgress(0);
    if (navigator.vibrate) navigator.vibrate(50);
    panicIntervalRef.current = setInterval(() => {
      setPanicProgress(prev => Math.min(prev + (100 / (3000 / 30)), 100));
    }, 30);

    panicTimerRef.current = setTimeout(async () => {
      clearInterval(panicIntervalRef.current!);
      setPanicProgress(100);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
      
      try {
        await supabase.from('incidents').insert({
          objective_id: assignedObjective?.id,
          operator_id: OPERATOR_ID,
          entry_type: 'panic',
          content: '🚨 BOTÓN DE PÁNICO ACTIVADO',
          latitude: location?.lat || null,
          longitude: location?.lng || null,
          status: 'critica'
        });
      } catch (e) {
        console.error("Error triggering panic:", e);
      }
      
      setTimeout(() => setPanicProgress(0), 3000); // Reset UI after 3s
    }, 3000);
  };

  const handlePanicEnd = () => {
    if (panicTimerRef.current) clearTimeout(panicTimerRef.current);
    if (panicIntervalRef.current) clearInterval(panicIntervalRef.current);
    if (panicProgress < 100) setPanicProgress(0);
  };

  // ─── AUTH & IDENTITY ───
  const OPERATOR_ID = user?.id || 'recurso_demo';

  // REUSABLE CHECKIN LOGIC
  const performCheckin = async (coords: {lat: number, lng: number, accuracy: number}) => {
    if (isCheckingInRef.current || isSubmitting) return;
    
    if (!assignedObjective?.id) {
      alert("⚠️ SIN OBJETIVO ASIGNADO\n\nNo tienes ningún objetivo asignado para fichar entrada. Solicita a tu gerente que te vincule a un objetivo.");
      setLocating(false);
      isCheckingInRef.current = false;
      setIsSubmitting(false);
      return;
    }
    
    isCheckingInRef.current = true;
    setIsSubmitting(true);
    const now = new Date();
    let serverShiftId: string | undefined = undefined;
    
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
          isCheckingInRef.current = false;
          return;
        }
        if (errorData.error === 'SIN OBJETIVO ASIGNADO') {
          alert(`⚠️ ${errorData.message || 'No tienes un objetivo asignado.'}`);
          setLocating(false);
          isCheckingInRef.current = false;
          return;
        }
        throw new Error(errorData.message || errorData.error || 'Error en el servidor');
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
      
      // Stop the temporary checkin tracker so ShiftProvider's background tracker can take over cleanly
      if (checkinTrackerRef.current) {
        checkinTrackerRef.current.stop();
        checkinTrackerRef.current = null;
      }
      setTracker(null);
      
      setLocating(false);
      setCanSkipGps(false);
    } catch (e: any) {
      console.error("Checkin error:", e);
      alert(e.message || "No se pudo iniciar servicio. Intentá de nuevo.");
      isCheckingInRef.current = false;
      setLocating(false);
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
            
            const obj = Array.isArray(res.objectives) ? res.objectives[0] : res.objectives;
            
            if (obj) {
              // 📍 Coordinate Validation & Guard
              if (!obj.latitude || !obj.longitude) {
                alert(`⚠️ ERROR DE ASIGNACIÓN: El objetivo "${obj.name}" no tiene coordenadas configuradas. Contacte a soporte.`);
              }
              setAssignedObjective(obj);
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
    let isHighAccuracy = true;
    
    const startWatching = () => {
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
          (err) => {
            console.warn('[Fichaje] GPS Initial Watch Error:', err.message, 'Code:', err.code);
            // Fallback to relaxed mode on timeout
            if (err.code === err.TIMEOUT && isHighAccuracy) {
              console.log('[Fichaje] GPS timeout during load. Re-starting in relaxed mode.');
              isHighAccuracy = false;
              if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
              }
              startWatching();
            }
          },
          { 
            enableHighAccuracy: isHighAccuracy, 
            timeout: isHighAccuracy ? 20000 : 30000, 
            maximumAge: isHighAccuracy ? 0 : 10000 
          }
        );
      }
    };

    startWatching();

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

  const handleClockClick = async () => {
    if (locating || isSubmitting) return;

    if (isShiftActive) {
      setShowHandoffModal(true);
      const objId = assignedObjective?.id || (shiftData as any)?.objective_id || (shiftData as any)?.current_objective_id;
      if (objId) {
        await fetchObjectiveItems(objId);
      }
      return;
    }

    if (!assignedObjective?.id) {
      alert("⚠️ SIN OBJETIVO ASIGNADO\n\nNo puedes fichar entrada porque no estás vinculado a ningún objetivo. Solicita a tu gerente que te asigne a un puesto.");
      return;
    }

    // Fetch inventory before checking in
    setLocating(true);
    try {
      const { data } = await supabase
        .from('resource_inventory')
        .select('*')
        .eq('objective_id', assignedObjective.id)
        .neq('status', 'baja');

      if (data && data.length > 0) {
        setInventoryItems(data);
        const initial: any = {};
        data.forEach(d => initial[d.id] = 'Operativo');
        setInventoryStatus(initial);
        setShowInventoryCheck(true);
        setLocating(false);
      } else {
        handleClock();
      }
    } catch (e) {
      handleClock();
    }
  };

  const confirmInventoryCheck = async () => {
    setShowInventoryCheck(false);
    // Report damages/missing as incidents
    for (const item of inventoryItems) {
      if (inventoryStatus[item.id] !== 'Operativo') {
        await supabase.from('incidents').insert({
          objective_id: assignedObjective?.id,
          operator_id: OPERATOR_ID,
          entry_type: 'novedad',
          content: `INVENTARIO INICIAL: ${item.item_name} reportado como ${inventoryStatus[item.id].toUpperCase()}`,
          latitude: location?.lat || 0,
          longitude: location?.lng || 0,
          status: 'crítica'
        });
      }
    }
    handleClock();
  };

  const handleClock = async () => {
    if (!isShiftActive && !assignedObjective?.id) {
      alert("⚠️ SIN OBJETIVO ASIGNADO\n\nNo puedes fichar entrada porque no estás vinculado a ningún objetivo. Solicita a tu gerente que te asigne a un puesto.");
      setLocating(false);
      return;
    }

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

    // Fast-path: If we ALREADY have a reasonably accurate location in state, trigger check-in immediately!
    if (location && location.lat && location.lng && (location.accuracy || 999) < 150) {
      performCheckin({
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy || 20
      });
      return;
    }

    const skipTimer = setTimeout(() => {
       if (locatingRef.current) setCanSkipGps(true);
    }, 3000); 

    const gpsTimeout = setTimeout(() => {
      if (locatingRef.current && !isShiftActiveRef.current) {
        setLocating(false);
        isCheckingInRef.current = false;
      }
    }, 30000); 

    try {
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

          const isAccurateEnough = coords.accuracy < 150;
          
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
        (err: any) => {
          const errCode = err?.code;
          const errMsg = err?.message || '';
          console.warn("[Fichaje] Tracker checkin GPS error:", errMsg, "Code:", errCode);
          
          if (errCode === 1) {
            setLocating(false);
            isCheckingInRef.current = false;
            alert("🔒 ACCESO A GPS DENEGADO\n\nPor favor, habilita los permisos de ubicación en la configuración de tu teléfono (Ajustes -> Privacidad -> Localización -> Safari) para que SPS pueda verificar tu puesto.");
          } else {
            console.warn("[Fichaje] Non-blocking GPS error (Timeout/Unavailable). Operator can use bypass button.");
          }
        },
        assignedObjective ? {
          location: { lat: assignedObjective.latitude, lng: assignedObjective.longitude },
          radius: assignedObjective.geofence_radius_meters || 100,
          id: assignedObjective.id
        } : undefined
      );

      newTracker.start();
      checkinTrackerRef.current = newTracker;
      setTracker(newTracker);
    } catch (e: any) {
      console.error("[Fichaje] Failed to initialize GPS Tracker:", e);
      alert("⚠️ Error de conexión al iniciar GPS. Por favor, recargá la página (refrescar el navegador) e intentá de nuevo.");
      setLocating(false);
      isCheckingInRef.current = false;
      clearTimeout(gpsTimeout);
      clearTimeout(skipTimer);
    }
  };

  const fetchObjectiveItems = async (targetObjId?: string) => {
    const objId = targetObjId || assignedObjective?.id || (shiftData as any)?.objective_id || (shiftData as any)?.current_objective_id;
    if (!objId) return [];
    try {
      setLoadingHandoff(true);
      const { data } = await supabase
        .from('resource_inventory')
        .select('*')
        .eq('objective_id', objId)
        .neq('status', 'baja');
      const items = data || [];
      setObjectiveItems(items);
      const initial: Record<string, string> = {};
      items.forEach(item => initial[item.id] = 'operativo');
      setItemConditions(initial);
      return items;
    } catch (e) {
      console.error(e);
      return [];
    } finally {
      setLoadingHandoff(false);
    }
  };

  const submitHandoffAndCheckout = async () => {
    try {
      setIsSubmitting(true);
      const objId = assignedObjective?.id || (shiftData as any)?.objective_id || (shiftData as any)?.current_objective_id;

      if (objId && objectiveItems.length > 0) {
        const items = objectiveItems.map(item => ({
          item_id: item.id,
          name: getItemDisplayName(item),
          condition: itemConditions[item.id] || 'operativo',
        }));
        await fetch('/api/inventory/handoff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            objective_id: objId,
            resource_id: OPERATOR_ID,
            shift_id: shiftId,
            items
          })
        });
      }

      if (handoffNotes.trim() && objId) {
        await supabase.from('guard_book_entries').insert({
          objective_id: objId,
          operator_id: OPERATOR_ID,
          entry_type: 'fichaje',
          content: `RELEVO Y CIERRE DE TURNO — ${handoffNotes.trim()}`,
          urgency: 'normal'
        });
      }

      setShowHandoffModal(false);
      setHandoffNotes('');
      await handleClock();
    } catch (e: any) {
      alert("Error al enviar el reporte.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRound = async () => {
    setIsSubmitting(true);
    try {
      if (!shiftData?.activeRoundId) {
        // Start Round
        const { data, error } = await supabase.from('patrol_rounds').insert({
          resource_id: OPERATOR_ID,
          objective_id: assignedObjective?.id
        }).select().single();
        
        if (!error && data) {
          updateShiftData({ activeRoundId: data.id });
          setHighFrequencyMode(true, data.id);
        } else {
          alert('Error al iniciar ronda: ' + (error?.message || 'Error desconocido'));
        }
      } else {
        // End Round
        await supabase.from('patrol_rounds').update({ end_at: new Date().toISOString() }).eq('id', shiftData.activeRoundId);
        updateShiftData({ activeRoundId: null });
        setHighFrequencyMode(false);
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const destinations = (assignedObjective && typeof assignedObjective.latitude === 'number' && typeof assignedObjective.longitude === 'number') 
    ? [{
        id: assignedObjective.id,
        name: assignedObjective.name,
        position: [assignedObjective.latitude, assignedObjective.longitude] as [number, number],
        radius: assignedObjective.geofence_radius_meters || 150
      }] 
    : [];

  let currentDistance = telemetry.distanceToTarget;
  let geofenceRadius = assignedObjective?.geofence_radius_meters || 150;
  
  if (currentDistance === null && location && assignedObjective?.latitude && assignedObjective?.longitude) {
    const R = 6371e3; 
    const p1 = location.lat * Math.PI/180;
    const p2 = assignedObjective.latitude * Math.PI/180;
    const dp = (assignedObjective.latitude-location.lat) * Math.PI/180;
    const dl = (assignedObjective.longitude-location.lng) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    currentDistance = R * c;
  }

  const isOutOfRange = !isShiftActive && currentDistance !== null && currentDistance > geofenceRadius;

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

  if (!loadingObjective && !assignedObjective && !isShiftActive) {
    return (
      <div className={cn("min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-6", theme === 'dark' ? "bg-black text-white" : "bg-[#f8f9fc] text-gray-900")}>
        <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center border border-amber-500/20 shadow-2xl">
          <AlertCircle className="w-10 h-10 text-amber-500 animate-pulse" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase tracking-tight text-amber-500">Sin Objetivo Asignado</h2>
          <p className="text-sm text-gray-500 font-medium max-w-xs mx-auto leading-relaxed">
            No estás vinculado a ningún puesto de trabajo en la plataforma. Solicita a tu gerente de operaciones que te asigne a un objetivo antes de fichar.
          </p>
        </div>
        <Link href="/operador">
          <Button className="h-14 px-8 uppercase font-black text-[10px] tracking-widest rounded-xl bg-zinc-900 text-white hover:bg-zinc-800">
            Volver al Inicio
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative h-screen flex flex-col transition-colors duration-500 bg-zinc-50 font-sans">
      {!hasConsent && <GPSConsentModal onAccept={() => setHasConsent(true)} />}

      {/* HEADER: Back button only */}
      <div className="absolute top-0 left-0 right-0 z-[56] p-6 pointer-events-none">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <Link href="/operador" className="pointer-events-auto">
            <motion.button 
              whileTap={{ scale: 0.9 }}
              className="w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center bg-white border border-zinc-200 text-zinc-900 transition-all"
            >
               <ArrowLeft size={22} />
            </motion.button>
          </Link>
        </div>
      </div>

      {/* DYNAMIC ISLAND: Premium Telemetry HUD */}
      <DynamicIsland
        accuracy={telemetry.accuracy ?? location?.accuracy ?? null}
        distanceToTarget={telemetry.distanceToTarget}
        syncStatus={telemetry.syncStatus}
        lastPointTimestamp={telemetry.lastPointTimestamp}
        isVisible={isShiftActive}
        theme={theme as 'light' | 'dark'}
      />

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

      {/* TACTICAL BOTTOM SHEET: 3-State Interactive Panel */}
      <TacticalSheet
        snapPoints={[0.14, 0.48, 0.85]}
        initialSnap={isShiftActive ? 1 : 0}
        theme="light"
        onSnapChange={(i) => {
          // Auto-expand when shift is active and sheet is collapsed
          if (i === 0 && isShiftActive) {
            // Allow collapse but show minimal info
          }
        }}
      >
        {({ currentSnap, snapTo }: { currentSnap: number; snapTo: (i: number) => void }) => (
          <div className="max-w-md mx-auto px-2">

            {/* ─── COLLAPSED PEEK: Always visible ─── */}
            <div
              className="flex items-center justify-between py-3 cursor-pointer"
              onClick={() => snapTo(currentSnap === 0 ? 1 : 0)}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl shadow-inner flex items-center justify-center transition-all shrink-0 bg-zinc-100">
                  <MapPin size={24} className={cn(assignedObjective ? 'text-[#D4AF37]' : 'text-zinc-300')} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-[#D4AF37]/60 uppercase tracking-[0.3em]">Puesto de Control</p>
                  <h3 className="text-lg font-black tracking-tight leading-tight truncate text-zinc-900">
                    {loadingObjective ? 'Localizando...' : (assignedObjective?.name || 'Sin Objetivo')}
                  </h3>
                </div>
              </div>
              <div className={cn(
                'px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0',
                isShiftActive
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-zinc-100 text-zinc-400'
              )}>
                {isShiftActive ? 'En Servicio' : 'Inactivo'}
              </div>
            </div>

            {/* ─── HALF EXPANDED: Objective details + Action Button ─── */}
            <AnimatePresence>
              {currentSnap >= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6 pt-4"
                >
                  {/* Address chip */}
                  {assignedObjective?.address && (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100">
                      <Navigation size={14} className="text-[#D4AF37] shrink-0" />
                      <span className="text-xs font-bold truncate text-zinc-500">
                        {assignedObjective.address}
                      </span>
                    </div>
                  )}

                  {/* ACTION BUTTON */}
                  <motion.button
                    whileHover={{ scale: (isOutOfRange || (!isShiftActive && !assignedObjective?.id)) ? 1 : 1.01 }}
                    whileTap={{ scale: (isOutOfRange || (!isShiftActive && !assignedObjective?.id)) ? 1 : 0.97 }}
                    onClick={handleClockClick}
                    disabled={locating || isSubmitting || isOutOfRange || (!isShiftActive && !assignedObjective?.id)}
                    className={cn(
                      'w-full h-[72px] rounded-[2rem] flex items-center justify-center gap-4 text-[12px] font-black uppercase tracking-[0.35em] shadow-xl transition-all border-none',
                      isShiftActive
                        ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-500/20'
                        : (!assignedObjective?.id)
                        ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                        : isOutOfRange ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed' : 'bg-zinc-900 text-white hover:bg-zinc-800'
                    )}
                  >
                    {locating ? (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Sincronizando</span>
                      </div>
                    ) : isShiftActive ? (
                      <><LogOut size={22} /> Finalizar Turno</>
                    ) : !assignedObjective?.id ? (
                      <><AlertTriangle size={20} className="text-amber-500" /> Sin Objetivo Asignado</>
                    ) : (
                      <><LogIn size={22} /> Iniciar Turno</>
                    )}
                  </motion.button>
                  
                  {!isShiftActive && !assignedObjective?.id && (
                    <p className="text-center text-[10px] font-black text-amber-600 uppercase tracking-widest mt-2">
                      ⚠️ No tienes un objetivo asignado. Solicita a gerencia que te vincule a un puesto.
                    </p>
                  )}

                  {isOutOfRange && assignedObjective?.id && (
                    <p className="text-center text-[10px] font-black text-amber-500 uppercase tracking-widest mt-2">
                      Fuera de rango: Acérquese al puesto para iniciar
                    </p>
                  )}

                  {/* Security badge */}
                  <div className="flex justify-center">
                    <div className="flex items-center gap-2.5 py-2 px-4 rounded-full bg-zinc-100">
                      <ShieldCheck size={13} className="text-emerald-500" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">704 OS Tactical</span>
                    </div>
                  </div>

                  {/* PANIC BUTTON */}
                  {isShiftActive && (
                    <motion.div 
                      onPointerDown={handlePanicStart}
                      onPointerUp={handlePanicEnd}
                      onPointerLeave={handlePanicEnd}
                      className="relative w-full h-14 rounded-[2rem] overflow-hidden flex items-center justify-center cursor-pointer select-none border border-red-200 bg-red-50"
                    >
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-red-600 transition-all duration-75"
                        style={{ width: `${panicProgress}%` }}
                      />
                      <div className={cn(
                        "relative z-10 flex items-center gap-3 font-black uppercase tracking-widest text-[11px]",
                        panicProgress > 0 ? "text-white" : "text-red-600"
                      )}>
                        <AlertTriangle size={16} className={panicProgress > 0 ? "animate-pulse" : ""} />
                        {panicProgress > 0 ? "Mantenga presionado..." : "S.O.S (Mantener 3s)"}
                      </div>
                    </motion.div>
                  )}

                  {/* EVIDENCE BUTTON */}
                  {isShiftActive && (
                    <button 
                      onClick={() => setShowScanner(true)}
                      className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[11px] border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition-all"
                    >
                      <Camera size={16} className="text-[#D4AF37]" />
                      Capturar Evidencia
                    </button>
                  )}

                  {/* ROUND BUTTON */}
                  {isShiftActive && (
                    <button 
                      onClick={handleToggleRound}
                      disabled={isSubmitting}
                      className={cn(
                        "w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[11px] transition-all shadow-lg",
                        shiftData?.activeRoundId 
                          ? "bg-[#D4AF37] text-black hover:bg-[#b08d29]" 
                          : "bg-zinc-900 text-white hover:bg-zinc-800"
                      )}
                    >
                      <MapPin size={16} className={shiftData?.activeRoundId ? "text-black" : "text-[#D4AF37]"} />
                      {shiftData?.activeRoundId ? "Finalizar Ronda" : "Iniciar Ronda"}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── FULLY EXPANDED: Live metrics ─── */}
            <AnimatePresence>
              {currentSnap >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                  className="pt-6 space-y-4"
                >
                  <p className={cn(
                    'text-[9px] font-black uppercase tracking-[0.35em] px-1',
                    theme === 'dark' ? 'text-white/15' : 'text-gray-300'
                  )}>Métricas de Servicio</p>

                  <div className="grid grid-cols-2 gap-3">
                    {/* GPS Accuracy */}
                    <div className={cn(
                      'p-4 rounded-2xl border',
                      theme === 'dark' ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-gray-50 border-gray-100'
                    )}>
                      <p className={cn('text-[9px] font-bold uppercase tracking-wider mb-1', theme === 'dark' ? 'text-white/25' : 'text-gray-400')}>Precisión GPS</p>
                      <p className={cn(
                        'text-2xl font-black tabular-nums',
                        (location?.accuracy ?? 999) <= 15 ? 'text-emerald-400' : (location?.accuracy ?? 999) <= 50 ? 'text-amber-400' : 'text-red-400'
                      )}>
                        {location?.accuracy ? `${Math.round(location.accuracy)}m` : '---'}
                      </p>
                    </div>

                    {/* Speed */}
                    <div className={cn(
                      'p-4 rounded-2xl border',
                      theme === 'dark' ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-gray-50 border-gray-100'
                    )}>
                      <p className={cn('text-[9px] font-bold uppercase tracking-wider mb-1', theme === 'dark' ? 'text-white/25' : 'text-gray-400')}>Velocidad</p>
                      <p className={cn('text-2xl font-black tabular-nums', theme === 'dark' ? 'text-blue-400' : 'text-blue-600')}>
                        {location?.speed ? `${(location.speed * 3.6).toFixed(1)}` : '0.0'}
                        <span className={cn('text-xs ml-1', theme === 'dark' ? 'text-white/20' : 'text-gray-300')}>km/h</span>
                      </p>
                    </div>

                    {/* Distance */}
                    <div className={cn(
                      'p-4 rounded-2xl border',
                      theme === 'dark' ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-gray-50 border-gray-100'
                    )}>
                      <p className={cn('text-[9px] font-bold uppercase tracking-wider mb-1', theme === 'dark' ? 'text-white/25' : 'text-gray-400')}>Dist. Objetivo</p>
                      <p className={cn('text-2xl font-black tabular-nums', theme === 'dark' ? 'text-purple-400' : 'text-purple-600')}>
                        {telemetry.distanceToTarget ? `${Math.round(telemetry.distanceToTarget)}m` : '---'}
                      </p>
                    </div>

                    {/* Sync */}
                    <div className={cn(
                      'p-4 rounded-2xl border',
                      theme === 'dark' ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-gray-50 border-gray-100'
                    )}>
                      <p className={cn('text-[9px] font-bold uppercase tracking-wider mb-1', theme === 'dark' ? 'text-white/25' : 'text-gray-400')}>Data Sync</p>
                      <div className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider mt-1',
                        telemetry.syncStatus === 'online' ? 'bg-emerald-500/10 text-emerald-400' :
                        telemetry.syncStatus === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-red-500/10 text-red-400'
                      )}>
                        {telemetry.syncStatus}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        )}
      </TacticalSheet>

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

              <div className="space-y-6 mb-8">
                {loadingHandoff ? (
                  <div className="p-12 text-center bg-gray-50 dark:bg-white/5 rounded-[3rem] border border-dashed border-gray-200 dark:border-white/5">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Verificando inventario asignado al puesto...</p>
                  </div>
                ) : objectiveItems.length === 0 ? (
                  <div className="p-8 text-left bg-emerald-500/10 border border-emerald-500/20 rounded-[2.5rem] space-y-4">
                    <div className="flex items-center gap-3">
                      <CheckSquare size={24} className="text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-sm font-black uppercase text-emerald-600 tracking-tight">Declaración Jurada de Relevo</p>
                        <p className="text-[11px] font-bold text-emerald-700/80 uppercase">Control de puesto certificado</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed pt-2 border-t border-emerald-500/10 font-medium">
                      Al presionar el botón de abajo, das fe de entregar el puesto en condiciones normales y finalizar tu turno operativo sin novedades pendientes.
                    </p>
                  </div>
                ) : objectiveItems.map((item) => (
                  <div key={item.id} className={cn("p-6 rounded-[2.5rem] border transition-all", theme === 'dark' ? "bg-zinc-900/40 border-white/5" : "bg-gray-50 border-gray-100")}>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <p className={cn("text-base font-black uppercase tracking-tight", theme === 'dark' ? "text-white" : "text-gray-800")}>{getItemDisplayName(item)}</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-wider">
                          {item.category ? `Categoría: ${item.category.toUpperCase()}` : ''} {item.serial_number ? `• SN: ${item.serial_number}` : ''}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Package size={20} className="text-blue-500" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
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
                              : (theme === 'dark' ? "bg-white/5 text-gray-500 border border-white/5" : "bg-white text-gray-400 border border-gray-100")
                          )}
                        >
                          {cond}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Close-out notes input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block text-left">Novedad o Nota de Relevo (Opcional)</label>
                  <textarea
                    value={handoffNotes}
                    onChange={(e) => setHandoffNotes(e.target.value)}
                    placeholder="Ej: Relevo en orden, novedades registradas en bitácora..."
                    className={cn(
                      "w-full p-4 text-xs font-bold rounded-2xl border outline-none transition-all resize-none h-20",
                      theme === 'dark' ? "bg-zinc-900 border-white/10 text-white focus:border-[#D4AF37]" : "bg-gray-50 border-gray-200 text-zinc-900 focus:border-zinc-900"
                    )}
                  />
                </div>
              </div>

              <Button 
                className="w-full h-18 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl bg-red-600 hover:bg-red-700 text-white border-none"
                onClick={submitHandoffAndCheckout}
                disabled={isSubmitting || loadingHandoff}
              >
                {isSubmitting ? 'Procesando Relevo...' : 'Confirmar y Finalizar Turno'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INVENTORY CHECK MODAL (START SHIFT) */}
      <AnimatePresence>
        {showInventoryCheck && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }}
              className={cn(
                "w-full max-w-sm rounded-3xl p-6 border",
                theme === 'dark' ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-gray-200"
              )}
            >
              <h2 className="text-xl font-black uppercase tracking-tighter mb-4 text-[#D4AF37]">Checklist de Inventario</h2>
              <p className="text-xs text-gray-400 mb-4 font-bold uppercase tracking-widest">Verificá los elementos asignados antes de iniciar el turno.</p>
              
              <div className="space-y-3 mb-6 max-h-[50vh] overflow-y-auto">
                {inventoryItems.map(item => (
                  <div key={item.id} className="p-3 bg-white/5 border border-white/10 rounded-xl">
                    <p className="font-black text-sm uppercase text-[#D4AF37] tracking-tight">{getItemDisplayName(item)}</p>
                    <p className="text-[10px] text-gray-400 font-mono mb-2">
                      {item.category ? `Categoría: ${item.category.toUpperCase()} ` : ''}{item.serial_number ? `• SN: ${item.serial_number}` : ''}
                    </p>
                    <div className="flex gap-2">
                      {['Operativo', 'Dañado', 'Faltante'].map(st => (
                        <button
                          key={st}
                          onClick={() => setInventoryStatus(prev => ({...prev, [item.id]: st}))}
                          className={cn(
                            "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors",
                            inventoryStatus[item.id] === st 
                              ? (st === 'Operativo' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30')
                              : "bg-white/5 text-gray-400 hover:bg-white/10"
                          )}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={confirmInventoryCheck}
                className="w-full py-4 bg-[#D4AF37] hover:bg-[#b8952b] text-zinc-950 font-black uppercase tracking-widest rounded-2xl"
              >
                Confirmar e Iniciar Turno
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DOCUMENT SCANNER MODAL */}
      {showScanner && isShiftActive && (
        <DocumentScanner
          objectiveId={assignedObjective?.id}
          operatorId={OPERATOR_ID}
          location={location}
          onClose={() => setShowScanner(false)}
          onUploadSuccess={(url) => {
            alert('Evidencia subida correctamente');
          }}
        />
      )}

    </div>
  );
}
