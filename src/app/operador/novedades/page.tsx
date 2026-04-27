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
  Plus,
  ShieldCheck,
  Smartphone,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { useShift } from '@/components/providers/ShiftProvider';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const quickButtons = [
  { id: 'vehiculo', icon: Car, label: 'Vehículo Sospechoso', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { id: 'intruso', icon: UserX, label: 'Persona Sospechosa', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  { id: 'puerta', icon: DoorOpen, label: 'Puerta Abierta', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { id: 'paquete', icon: Package, label: 'Objeto Extraño', color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  { id: 'luces', icon: Lightbulb, label: 'Falla Eléctrica', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  { id: 'puesto', icon: Plus, label: 'Libro de Guardia', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
  { id: 'emergencia', icon: AlertTriangle, label: 'Alerta Crítica', color: 'text-red-600', bg: 'bg-red-600/10', border: 'border-red-600/30' },
];

export default function NovedadesPage() {
  const { isShiftActive, shiftData, theme } = useShift();
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
      const entryType = selectedData.id === 'puesto' ? 'libro_guardia' : 'incidente';
      
      const { error } = await supabase
        .from('guard_book_entries')
        .insert({
          objective_id: (shiftData as any)?.objective_id || (shiftData as any)?.current_objective_id || 'objetivo_demo',
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
      }, 3000);
    } catch (error: any) {
      console.error('Failed to submit entry', error);
      alert('Error en el reporte: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  if (!isShiftActive) {
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
            El protocolo de reporte requiere un <span className="text-primary font-bold">turno activo</span> iniciado por el operador.
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
      "min-h-screen p-5 pb-32 transition-colors duration-500",
      theme === 'dark' ? "bg-[#0a0a0a]" : "bg-gray-50"
    )}>
      {/* Premium Header */}
      <div className="max-w-md mx-auto mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/operador">
            <button className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-90",
              theme === 'dark' ? "bg-zinc-900/80 border border-white/5 text-white" : "bg-white border border-gray-100 text-gray-900"
            )}>
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div>
            <h1 className={cn("text-xl font-black uppercase tracking-tighter italic", theme === 'dark' ? "text-white" : "text-gray-900")}>
              Novedades
            </h1>
            <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mt-0.5">Operativo 704</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
           <div className="flex items-center gap-1.5 px-3 py-1 bg-primary text-black rounded-full shadow-lg shadow-primary/20 scale-90 origin-right">
              <Smartphone size={10} className="font-black" />
              <span className="text-[8px] font-black uppercase">PWA Active</span>
           </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!selectedIncident ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="max-w-md mx-auto grid grid-cols-2 gap-4"
          >
            {quickButtons.map((btn, i) => (
              <motion.button
                key={btn.id}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleSelect(btn.id)}
                className={cn(
                  "relative group p-6 rounded-[2.5rem] border-2 transition-all overflow-hidden flex flex-col items-center gap-5 text-center shadow-2xl",
                  theme === 'dark' 
                    ? "bg-zinc-900/60 border-white/5 hover:border-primary/20 backdrop-blur-md" 
                    : "bg-white border-transparent hover:border-primary/20"
                )}
              >
                <div className={cn(
                   "absolute top-0 right-0 w-24 h-24 blur-[40px] opacity-20 -translate-y-1/2 translate-x-1/2 group-hover:opacity-40 transition-opacity",
                   btn.bg.replace('/10', '')
                )} />
                
                <div className={cn(
                  "w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110 relative z-10",
                  btn.bg, btn.color, btn.border, "border"
                )}>
                  <btn.icon size={28} />
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-[0.15em] leading-tight relative z-10 italic",
                  theme === 'dark' ? "text-gray-300" : "text-gray-700"
                )}>
                  {btn.label}
                </span>
                <ChevronRight className="absolute bottom-4 right-6 text-gray-500 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" size={14} />
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 100 }}
            className="max-w-md mx-auto"
          >
            {success ? (
               <motion.div
                 initial={{ scale: 0.9, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 className={cn(
                   "p-12 h-96 rounded-[3rem] flex flex-col items-center justify-center text-center space-y-8 shadow-2xl border",
                   theme === 'dark' ? "bg-zinc-900 border-white/5" : "bg-white border-gray-100"
                 )}
               >
                 <div className="relative">
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-green-500 blur-[40px] rounded-full"
                    />
                    <div className="w-28 h-28 bg-green-500 text-black rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-green-500/40 relative z-10">
                        <CheckCircle2 size={54} />
                    </div>
                 </div>
                 <div className="space-y-2">
                   <h2 className={cn("text-3xl font-black uppercase tracking-tighter italic", theme === 'dark' ? "text-white" : "text-gray-900")}>
                     Reporte Enviado
                   </h2>
                   <p className="text-[10px] text-green-500 font-black uppercase tracking-[0.3em]">Protocolo Sincronizado</p>
                 </div>
               </motion.div>
            ) : (
              <div className="space-y-6">
                <Card className={cn(
                  "p-8 border-none shadow-2xl overflow-hidden rounded-[3rem] relative",
                  theme === 'dark' ? "bg-zinc-900/60 backdrop-blur-xl border border-white/5" : "bg-white/90 backdrop-blur-md"
                )}>
                  {/* Decorative element */}
                  <div className={cn("absolute top-0 left-0 w-full h-1.5", selectedData?.bg.replace('/10', ''))} />
                  
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xl", selectedData?.bg, selectedData?.color, selectedData?.border)}>
                        {selectedData && <selectedData.icon size={24} />}
                      </div>
                      <div>
                        <h3 className={cn("text-lg font-black uppercase italic tracking-tight", theme === 'dark' ? "text-white" : "text-gray-900")}>
                          {selectedData?.label}
                        </h3>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-0.5">Captura de Novedad</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedIncident(null)} className="w-10 h-10 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-400 flex items-center justify-center transition-all">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <button className={cn(
                        "flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] border-2 border-dashed transition-all active:scale-95 group",
                        theme === 'dark' ? "border-white/10 bg-white/5 hover:border-primary/40" : "border-gray-100 bg-gray-50/50 hover:border-primary/40"
                      )}>
                         <Camera size={24} className="text-gray-400 group-hover:text-primary transition-transform group-hover:scale-110" />
                         <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Cámara</span>
                      </button>
                      <button className={cn(
                        "flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] border-2 border-dashed transition-all active:scale-95 group",
                        theme === 'dark' ? "border-white/10 bg-white/5 hover:border-primary/40" : "border-gray-100 bg-gray-50/50 hover:border-primary/40"
                      )}>
                         <Mic size={24} className="text-gray-400 group-hover:text-primary transition-transform group-hover:scale-110" />
                         <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Audio</span>
                      </button>
                    </div>

                    <div className={cn(
                      "p-5 rounded-3xl flex items-center gap-4 transition-colors",
                      theme === 'dark' ? "bg-black/40 border border-white/5" : "bg-green-50/50 border border-green-100"
                    )}>
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transform rotate-45",
                        theme === 'dark' ? "bg-primary text-black" : "bg-green-500 text-white"
                      )}>
                        <MapPin size={18} className="-rotate-45" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-[10px] font-black uppercase tracking-tight italic", theme === 'dark' ? "text-primary" : "text-green-700")}>Certificado Tactical GPS</p>
                        <p className="text-[9px] text-gray-500 font-bold uppercase truncate mt-0.5">
                          {shiftData?.location?.lat?.toFixed(5)} • {shiftData?.location?.lng?.toFixed(5)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] px-2 italic">Observación de Campo</label>
                      <textarea 
                        placeholder="Describa los hechos detectados..."
                        className={cn(
                          "w-full rounded-[2rem] p-6 text-sm focus:outline-none focus:ring-4 transition-all min-h-[160px] resize-none",
                          theme === 'dark' 
                            ? "bg-black/40 border border-white/10 text-white placeholder:text-gray-600 focus:ring-primary/10 focus:border-primary/30" 
                            : "bg-gray-50 border border-gray-100 text-gray-900 placeholder:text-gray-400 focus:ring-primary/5 focus:border-primary/30"
                        )}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                    </div>

                    <Button 
                      className="w-full h-18 rounded-[2rem] uppercase font-black text-sm tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group overflow-hidden relative"
                      onClick={handleSend}
                      disabled={isSending}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {isSending ? (
                        <div className="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin relative z-10" />
                      ) : (
                        <Send size={22} className="relative z-10 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /> 
                      )}
                      <span className="relative z-10">{isSending ? 'Sincronizando...' : 'Transmitir Alerta'}</span>
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
