'use client';

import React, { useState, useEffect } from 'react';
import { 
  MapPin, LogIn, LogOut, Navigation, 
  ShieldCheck, AlertCircle, ArrowLeft
} from 'lucide-react';
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
  const [tracker, setTracker] = useState<any>(null);
  const [locating, setLocating] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [hasConsent, setHasConsent] = useState(true);
  const [assignedObjective, setAssignedObjective] = useState<any>(null);
  const [loadingObjective, setLoadingObjective] = useState(true);
  
  const OPERATOR_ID = 'recurso_demo'; 

  useEffect(() => {
    try {
      const consent = localStorage.getItem('sps_gps_consent');
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
    if (!isShiftActive && tracker) {
      tracker.stop();
      setTracker(null);
    }
  }, [isShiftActive, tracker]);

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
      return;
    }

    const { GPSTracker } = await import('@/lib/gps-tracker');
    const newTracker = new GPSTracker(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(coords);
        
        if (!isShiftActive) {
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
                longitude: coords.lng
              })
            });
            const data = await res.json();
            if (data.shift?.id) serverShiftId = data.shift.id;
            if (data.warning) alert("⚠️ ATENCIÓN: " + data.warning);
          } catch (e) {}

          startShift({ time: now, location: coords, operator_id: OPERATOR_ID }, serverShiftId);
        } else {
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
        if (!isShiftActive) startShift({ time: new Date(), operator_id: OPERATOR_ID });
      },
      5000
    );

    newTracker.start();
    setTracker(newTracker);
    setLocating(false);
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
          
          <div className="pointer-events-auto bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm border border-gray-100 flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", isShiftActive ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
            <span className="text-[10px] font-black uppercase text-gray-700 tracking-tight">
              {isShiftActive ? 'Servicio Activo' : 'Fuera de Servicio'}
            </span>
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
              Al fichar, tu ubicación GPS será certificada conforme a los protocolos de seguridad de SPS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
