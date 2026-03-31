'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, 
  DoorOpen, 
  Lightbulb, 
  UserX, 
  Package, 
  AlertTriangle,
  Camera,
  Mic,
  Send,
  CheckCircle2,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Link from 'next/link';
import { useShift } from '@/components/providers/ShiftProvider';

const quickButtons = [
  { id: 'vehiculo', icon: Car, label: 'Vehículo Sospechoso', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/50' },
  { id: 'intruso', icon: UserX, label: 'Intruso Detectado', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/50' },
  { id: 'puerta', icon: DoorOpen, label: 'Puerta Forzada/Abierta', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/50' },
  { id: 'paquete', icon: Package, label: 'Paquete Sospechoso', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/50' },
  { id: 'luces', icon: Lightbulb, label: 'Fallo de Iluminación', color: 'text-gray-300', bg: 'bg-gray-500/10', border: 'border-gray-500/50' },
  { id: 'emergencia', icon: AlertTriangle, label: 'Otra Emergencia', color: 'text-red-600', bg: 'bg-red-600/10', border: 'border-red-600/50' },
];

export default function NovedadesRapidas() {
  const { isShiftActive } = useShift();
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [comment, setComment] = useState('');

  const handleSelect = (id: string) => {
    setSelectedIncident(id);
    setSuccess(false);
  };

  const handleSend = () => {
    // Mock API Call
    setTimeout(() => {
      setSuccess(true);
      setTimeout(() => {
        setSelectedIncident(null);
        setSuccess(false);
        setComment('');
      }, 2000);
    }, 800);
  };

  if (!isShiftActive) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-xl font-black text-white uppercase tracking-tighter">Turno Inactivo</h2>
        <p className="text-gray-400 text-xs uppercase tracking-widest mt-2">
          Debe iniciar turno para reportar novedades.
        </p>
        <Link href="/operador">
          <Button className="mt-6">Volver al Inicio</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 pb-24 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/operador">
          <Button variant="outline" className="w-10 h-10 p-0 rounded-full border-primary/20">
            <ChevronLeft size={18} />
          </Button>
        </Link>
        <div>
          <p className="text-[10px] text-primary uppercase tracking-widest font-display italic">Reporte Táctico</p>
          <h1 className="text-2xl font-bold font-display uppercase tracking-tight">Novedades Rápidas</h1>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!selectedIncident ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-2 gap-4"
          >
            {quickButtons.map((btn) => (
              <Button
                key={btn.id}
                variant="outline"
                className={`h-32 flex flex-col gap-3 py-4 border-2 ${btn.border} ${btn.bg} hover:bg-black/40 transition-all`}
                onClick={() => handleSelect(btn.id)}
              >
                <btn.icon size={32} strokeWidth={1.5} className={btn.color} />
                <span className={`text-[10px] font-bold uppercase tracking-widest whitespace-normal text-center leading-tight ${btn.color}`}>
                  {btn.label}
                </span>
              </Button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="space-y-4"
          >
            {success ? (
               <Card className="border-green-500/50 bg-green-500/10 h-64 flex flex-col items-center justify-center">
                 <CheckCircle2 size={64} className="text-green-500 mb-4" />
                 <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Reporte Enviado</h2>
                 <p className="text-green-400 text-xs uppercase tracking-widest mt-1">Con ubicación GPS</p>
               </Card>
            ) : (
              <Card className="border-primary/20 bg-secondary/50 backdrop-blur-md">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-primary/10 pb-4">
                    <div className="flex items-center gap-3">
                      {React.createElement(quickButtons.find(b => b.id === selectedIncident)?.icon || AlertTriangle, {
                        size: 24,
                        className: quickButtons.find(b => b.id === selectedIncident)?.color
                      })}
                      <h3 className="font-bold text-white uppercase tracking-wide">
                        {quickButtons.find(b => b.id === selectedIncident)?.label}
                      </h3>
                    </div>
                    <button onClick={() => setSelectedIncident(null)} className="text-gray-500 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button variant="outline" className="h-14 border-primary/30 flex-col gap-1 py-2">
                       <Camera size={16} className="text-primary" />
                       <span className="text-[9px] uppercase tracking-widest text-primary">Adjuntar Foto</span>
                    </Button>
                    <Button variant="outline" className="h-14 border-primary/30 flex-col gap-1 py-2">
                       <Mic size={16} className="text-primary" />
                       <span className="text-[9px] uppercase tracking-widest text-primary">Nota de Audio</span>
                    </Button>
                  </div>

                  <div className="pt-2">
                    <textarea 
                      placeholder="Agregue detalles adicionales (Opcional)..."
                      className="w-full bg-black/50 border border-primary/20 rounded-md p-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 min-h-[100px] resize-none"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>

                  <Button className="w-full h-14 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-widest" onClick={handleSend}>
                    <Send size={18} className="mr-2" /> ENVIAR ALERTA YA
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// X icon for close
function X({ size, className }: { size?: number, className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}
