'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Clock, MapPin, AlertCircle, 
  User, ChevronRight, LogIn, LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

import { useShift } from '@/components/providers/ShiftProvider';
import { isConfigured } from '@/lib/supabase';

export default function GuardiaDashboard() {
  const { isShiftActive, startShift, endShift } = useShift();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [locating, setLocating] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClock = () => {
    if (locating) return;
    
    setLocating(true);

    if (isShiftActive) {
      endShift();
      setClockInTime(null);
      setLocating(false);
      return;
    }

    // Get geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(coords);
          const now = new Date();
          setClockInTime(now);
          startShift({ time: now, location: coords });
          setLocating(false);
        },
        (err) => {
          console.error("Geolocation error:", err);
          const now = new Date();
          setClockInTime(now);
          startShift({ time: now });
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      const now = new Date();
      setClockInTime(now);
      startShift({ time: now });
      setLocating(false);
    }
  };

  const getElapsedTime = () => {
    if (!clockInTime) return '00:00:00';
    const diff = currentTime.getTime() - clockInTime.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-5 pb-32 max-w-md mx-auto space-y-5">
      
      {/* Greeting */}
      <div className="pt-2 flex justify-between items-end">
        <div>
          <p className="text-sm text-gray-400">Buen día,</p>
          <h1 className="text-xl font-bold text-gray-900">Guardia</h1>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-100 rounded-full shadow-sm mb-1">
           <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isConfigured ? "bg-green-500" : "bg-amber-500")} />
           <span className="text-[10px] font-black uppercase text-gray-400">{isConfigured ? 'Live' : 'Demo'}</span>
        </div>
      </div>

      {/* Clock Card */}
      <Card className={cn(
        "p-6 text-center",
        isShiftActive ? "border-green-200 bg-green-50/50" : ""
      )}>
        {/* Time Display */}
        <p className="text-4xl font-bold text-gray-900 mb-1">
          {currentTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-xs text-gray-400 mb-6">
          {currentTime.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>

        {/* Status */}
        {isShiftActive && (
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-semibold text-green-600">En servicio</span>
            </div>
            <p className="text-2xl font-mono font-bold text-gray-900">{getElapsedTime()}</p>
            <p className="text-xs text-gray-400 mt-1">
              Entrada: {clockInTime?.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}

        {/* Clock Button */}
        <Button
          variant={isShiftActive ? "danger" : "success"}
          className="w-full h-14 text-base font-bold rounded-2xl"
          onClick={handleClock}
          disabled={locating}
        >
          {locating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Obteniendo ubicación...
            </>
          ) : isShiftActive ? (
            <>
              <LogOut size={20} />
              Fichar Salida
            </>
          ) : (
            <>
              <LogIn size={20} />
              Fichar Entrada
            </>
          )}
        </Button>

        {/* Location indicator */}
        {location && (
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <MapPin size={12} className="text-gray-400" />
            <span className="text-[10px] text-gray-400">
              Ubicación registrada: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </span>
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-gray-700 px-1">Acciones Rápidas</h2>
        
        {[
          { label: 'Cargar Novedad', desc: 'Reportar una novedad del servicio', href: '/operador/novedades', icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Libro de Guardia', desc: 'Registro de actividades del puesto', href: '/operador/novedades', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Mi Perfil', desc: 'Ver mis datos personales', href: '/operador/novedades', icon: User, color: 'text-gray-500', bg: 'bg-gray-100' },
        ].map((action, i) => (
          <Card key={i} className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="flex items-center gap-4">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", action.bg, action.color)}>
                <action.icon size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{action.label}</p>
                <p className="text-xs text-gray-400">{action.desc}</p>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </div>
          </Card>
        ))}
      </div>

      {/* Objective Info */}
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPin size={14} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Objetivo asignado</p>
            <p className="text-sm font-semibold text-gray-900">Sin asignación activa</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
