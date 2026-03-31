'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Square, 
  ShieldAlert, 
  Camera, 
  Navigation, 
  Activity,
  CheckCircle2,
  AlertTriangle,
  FileBox,
  CarFront
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useShift } from '@/components/providers/ShiftProvider';
import { CameraCapture } from '@/components/ui/CameraCapture';
import Link from 'next/link';

export default function OperadorHome() {
  const { isShiftActive, startShift, endShift } = useShift();
  const [shift, setShift] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState('Puesto San Lorenzo (A-4)');
  const [gpsStatus, setGpsStatus] = useState('active');
  const [showCamera, setShowCamera] = useState(false);

  const handleInitiateCheckIn = () => {
    setShowCamera(true);
  };

  const handleCheckIn = async (file: File | null, dataUrl: string) => {
    setShowCamera(false);
    setLoading(true);
    try {
      const result = await api.shifts.checkin({
        operator_id: '550e8400-e29b-41d4-a716-446655440000', // Placeholder
        objective_id: '550e8400-e29b-41d4-a716-446655440001', // Placeholder
        latitude: -31.62,
        longitude: -60.70,
        photo_data: dataUrl,
      });
      setShift(result.shift);
      startShift(result.shift);
    } catch (error) {
      console.error('Check-in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      endShift();
    } catch (error) {
      console.error('Check-out error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Duty Status Card */}
      <Card className={cn(
        "border-2 transition-all duration-500",
        isShiftActive ? "border-green-500/50 bg-green-500/5" : "border-primary/20"
      )}>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="text-right">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">ID Servicio</p>
              <p className="text-xl font-black text-primary font-mono">{shift?.id?.slice(0, 8) || '---'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-display">Estado de Servicio</p>
              <h2 className="text-2xl font-bold font-display uppercase tracking-tight">
                {isShiftActive ? 'En Guardia' : 'Fuera de Servicio'}
              </h2>
            </div>
            <div className={cn(
              "w-3 h-3 rounded-full",
              isShiftActive ? "bg-green-500 animate-pulse" : "bg-gray-700"
            )} />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 bg-black/40 border border-primary/10">
              <p className="text-[8px] text-gray-600 uppercase mb-1">Ubicación Actual</p>
              <p className="text-[10px] text-white font-bold truncate">{location}</p>
            </div>
            <div className="p-3 bg-black/40 border border-primary/10">
              <p className="text-[8px] text-gray-600 uppercase mb-1">Señal GPS</p>
              <div className="flex items-center gap-1">
                <Navigation size={10} className="text-green-500" />
                <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Óptima</span>
              </div>
            </div>
          </div>

          <Button 
            variant={isShiftActive ? "outline" : "default"}
            className="w-full h-16 text-lg font-bold"
            onClick={isShiftActive ? handleCheckOut : handleInitiateCheckIn}
            disabled={loading}
          >
            {isShiftActive ? (
              <><Square className="mr-3 fill-current" size={20} /> FINALIZAR TURNO</>
            ) : (
              <><Play className="mr-3 fill-current" size={20} /> INICIAR TURNO</>
            )}
          </Button>
        </CardContent>
      </Card>

      {showCamera && (
        <CameraCapture 
          onCapture={handleCheckIn}
          onCancel={() => setShowCamera(false)}
        />
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/operador/novedades" className="block">
          <Button variant="tactical" className="w-full h-28 flex flex-col gap-3 py-4">
            <AlertTriangle size={24} className="text-yellow-500" />
            <span className="text-[10px] tracking-widest uppercase">Novedad Rápida</span>
          </Button>
        </Link>
        <Link href="/operador/accesos" className="block">
          <Button variant="tactical" className="w-full h-28 flex flex-col gap-3 py-4">
            <CarFront size={24} className="text-blue-500" />
            <span className="text-[10px] tracking-widest uppercase">Control Accesos</span>
          </Button>
        </Link>
      </div>

      {/* Emergency SOS Button */}
      <Button 
        variant="destructive" 
        className="w-full h-24 bg-red-600 hover:bg-red-700 text-white relative overflow-hidden group border-none shadow-lg shadow-red-900/20"
      >
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-red-400 opacity-10 pointer-events-none"
        />
        <div className="flex items-center gap-4 relative z-10">
          <ShieldAlert size={32} strokeWidth={2.5} className="group-active:scale-95 transition-transform" />
          <div className="text-left">
            <p className="text-xl font-black italic tracking-tighter">S.O.S. PÁNICO</p>
            <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Aviso inmediato a Central</p>
          </div>
        </div>
      </Button>

      {/* Active Objectives / Checkpoints */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-display text-primary uppercase tracking-[0.2em] flex items-center gap-2">
          <CheckCircle2 size={14} /> Puntos Pendientes
        </h3>
        
        {[
          { name: 'Entrada Principal (Portón 1)', time: 'Hace 5 min' },
          { name: 'Cerco Perimetral Norte', time: 'Vencido!', alert: true },
        ].map((item, i) => (
          <div key={i} className="p-4 bg-secondary border border-primary/10 flex justify-between items-center group">
            <div>
              <p className="text-xs font-bold text-white uppercase">{item.name}</p>
              <p className={cn("text-[9px] uppercase", item.alert ? "text-red-500 animate-pulse" : "text-gray-500")}>
                {item.time}
              </p>
            </div>
            {item.alert ? <AlertTriangle size={16} className="text-red-500" /> : <ChevronRight size={16} className="text-gray-600" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// Utility icon for the table
function ChevronRight({ size, className }: { size?: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}

// Helper for class narrowing
function cn(...inputs: string[]) {
  return inputs.filter(Boolean).join(' ');
}
