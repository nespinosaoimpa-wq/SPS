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
  ArrowLeft,
  X,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';
import { useShift } from '@/components/providers/ShiftProvider';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const quickButtons = [
  { id: 'vehiculo', icon: Car, label: 'Vehículo Sospechoso', color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'intruso', icon: UserX, label: 'Persona Sospechosa', color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'puerta', icon: DoorOpen, label: 'Puerta Abierta', color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'paquete', icon: Package, label: 'Objeto Extraño', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { id: 'luces', icon: Lightbulb, label: 'Falla Eléctrica', color: 'text-gray-600', bg: 'bg-gray-50' },
  { id: 'puesto', icon: Plus, label: 'Libro de Guardia', color: 'text-gray-900', bg: 'bg-gray-100' },
  { id: 'emergencia', icon: AlertTriangle, label: 'Alerta Crítica', color: 'text-red-700', bg: 'bg-red-100' },
];

export default function NovedadesPage() {
  const { isShiftActive, shiftData } = useShift();
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [comment, setComment] = useState('');

  const handleSelect = (id: string) => {
    setSelectedIncident(id);
    setSuccess(false);
  };

  const selectedData = quickButtons.find(b => b.id === selectedIncident);

  const handleSend = async () => {
    if (!selectedData) return;
    setIsSending(true);
    
    try {
      // 1. Determine entry type
      const entryType = selectedData.id === 'puesto' ? 'libro_guardia' : 'incidente';
      
      // 2. Save to guard_book_entries (Unified log for the manager)
      const { error } = await supabase
        .from('guard_book_entries')
        .insert({
          objective_id: (shiftData as any)?.objective_id || 'objetivo_demo',
          resource_id: (shiftData as any)?.operator_id || 'recurso_demo',
          entry_type: entryType,
          content: `${selectedData.label.toUpperCase()}: ${comment || 'Sin detalles adicionales'}`,
          latitude: shiftData?.location?.lat,
          longitude: shiftData?.location?.lng,
        });

      if (error) throw error;
      
      setSuccess(true);
      setTimeout(() => {
        setSelectedIncident(null);
        setSuccess(false);
        setComment('');
      }, 2500);
    } catch (error: any) {
      console.error('Failed to submit entry', error);
      alert('Error al registrar en el libro de guardia: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  if (!isShiftActive) {
    return (
      <div className="p-8 h-[80vh] flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-amber-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Turno Inactivo</h2>
          <p className="text-sm text-gray-500">
            Debes iniciar tu turno para reportar novedades en el sistema.
          </p>
        </div>
        <Link href="/operador">
          <Button variant="primary" className="h-12 px-8 uppercase font-bold text-xs">Volver al Inicio</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-5 pb-32 max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/operador">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-gray-500" />
          </button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Novedades</h1>
      </div>

      <AnimatePresence mode="wait">
        {!selectedIncident ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-2 gap-4"
          >
            {quickButtons.map((btn) => (
              <button
                key={btn.id}
                onClick={() => handleSelect(btn.id)}
                className={cn(
                  "p-5 rounded-3xl border-2 border-transparent bg-white shadow-sm flex flex-col items-center gap-4 text-center transition-all active:scale-95 touch-manipulation",
                  "hover:border-primary/30"
                )}
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", btn.bg, btn.color)}>
                  <btn.icon size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-700 leading-tight">
                  {btn.label}
                </span>
              </button>
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
               <Card className="p-10 flex flex-col items-center justify-center text-center space-y-4">
                 <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center shadow-lg shadow-green-100/50">
                    <CheckCircle2 size={40} />
                 </div>
                 <div className="space-y-1">
                   <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Reporte Enviado</h2>
                   <p className="text-xs text-gray-400 font-medium uppercase">Ubicación registrada con éxito</p>
                 </div>
               </Card>
            ) : (
              <Card className="p-6 space-y-6 shadow-2xl shadow-gray-200/50">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", selectedData?.bg, selectedData?.color)}>
                      {selectedData && <selectedData.icon size={20} />}
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase">
                      {selectedData?.label}
                    </h3>
                  </div>
                  <button onClick={() => setSelectedIncident(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Multimedia</p>
                    <span className="text-[9px] font-black text-blue-500 uppercase flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100/50">
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                      Opcional
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/30 hover:bg-white hover:border-primary/50 transition-all group overflow-hidden relative">
                       <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                       <Camera size={22} className="text-gray-400 group-hover:text-primary transition-transform group-hover:scale-110" />
                       <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">Cámara</span>
                    </button>
                    <button className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/30 hover:bg-white hover:border-primary/50 transition-all group overflow-hidden relative">
                       <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                       <Mic size={22} className="text-gray-400 group-hover:text-primary transition-transform group-hover:scale-110" />
                       <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">Audio</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-green-50/50 border border-green-100 rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-green-700 uppercase tracking-tight">Ubicación Certificada</p>
                    <p className="text-[9px] text-green-600/70 font-bold uppercase truncate">
                      GPS Activo: {shiftData?.location?.lat?.toFixed(5)}, {shiftData?.location?.lng?.toFixed(5)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Detalles de la Novedad</label>
                  <textarea 
                    placeholder="Escribí aquí lo ocurrido..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[120px] resize-none transition-all"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>

                <Button 
                  className="w-full h-14 uppercase font-black text-sm tracking-wider shadow-lg shadow-primary/20" 
                  onClick={handleSend}
                  disabled={isSending}
                >
                  {isSending ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin mr-2" />
                  ) : (
                    <Send size={18} className="mr-2" /> 
                  )}
                  {isSending ? 'Enviando...' : 'Reportar Ahora'}
                </Button>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
