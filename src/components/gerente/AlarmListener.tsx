'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, X, Volume2, VolumeX, MapPin, Phone, User, Shield, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Alarm {
  id: string;
  triggered_by: string;
  objective_id?: string;
  alarm_type?: string;
  message?: string;
  latitude?: number;
  longitude?: number;
  status?: string;
  operator_name?: string;
  operator_latitude?: number;
  operator_longitude?: number;
  objective_name?: string;
  created_at?: string;
}

export function AlarmListener() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [panicAlarm, setPanicAlarm] = useState<Alarm | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    // Escuchar nuevas alarmas en tiempo real
    const channel = supabase
      .channel('global-alarms')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alarms' },
        (payload) => {
          const newAlarm = payload.new as Alarm;
          
          // Check if this is a panic alarm
          if (newAlarm.alarm_type === 'panico' || newAlarm.alarm_type === 'emergencia') {
            setPanicAlarm(newAlarm);
            playAlarmSound(true);
            triggerVibration();
          } else {
            setAlarms((prev) => [newAlarm, ...prev]);
            playAlarmSound(false);
            triggerVibration();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled]);

  const playAlarmSound = (isPanic: boolean) => {
    if (!soundEnabled) return;
    try {
      // Use the Web Audio API for a more reliable alarm sound
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const duration = isPanic ? 2 : 0.5;
      const freq = isPanic ? 880 : 440;
      
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = isPanic ? 'sawtooth' : 'sine';
      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
      
      if (isPanic) {
        // Siren effect for panic
        oscillator.frequency.linearRampToValueAtTime(1200, audioCtx.currentTime + 0.5);
        oscillator.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 1.0);
        oscillator.frequency.linearRampToValueAtTime(1200, audioCtx.currentTime + 1.5);
        oscillator.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 2.0);
      }
      
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (err) {
      console.warn('Audio context unavailable:', err);
    }
  };

  const triggerVibration = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      // Patrón SOS: 3 cortos, 3 largos, 3 cortos
      navigator.vibrate([100, 30, 100, 30, 100, 200, 300, 30, 300, 30, 300, 200, 100, 30, 100, 30, 100]);
    }
  };

  const dismissAlarm = async (id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
    // Marcar en DB como reconocida
    await supabase.from('alarms').update({ status: 'acknowledged' }).eq('id', id);
  };

  const dismissPanic = async () => {
    if (panicAlarm) {
      await supabase.from('alarms').update({ status: 'acknowledged' }).eq('id', panicAlarm.id);
      setPanicAlarm(null);
    }
  };

  const getTimeSinceAlarm = (createdAt?: string) => {
    if (!createdAt) return 'Ahora';
    const diff = Date.now() - new Date(createdAt).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `Hace ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `Hace ${minutes}min`;
  };

  return (
    <>
      {/* ═══════════ FULL-SCREEN PANIC OVERLAY ═══════════ */}
      <AnimatePresence>
        {panicAlarm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95 backdrop-blur-xl"
          >
            {/* Pulsating red background */}
            <motion.div
              animate={{ 
                opacity: [0.1, 0.3, 0.1],
                scale: [1, 1.05, 1]
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 bg-red-600"
            />

            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="relative z-10 w-full max-w-lg mx-6 text-center space-y-8"
            >
              {/* Alert Icon */}
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="mx-auto"
              >
                <div className="w-32 h-32 mx-auto bg-red-500 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_80px_rgba(239,68,68,0.8)]">
                  <AlertTriangle size={64} className="text-white" />
                </div>
              </motion.div>

              {/* Title */}
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter">
                  ¡ALERTA DE PÁNICO!
                </h1>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-sm font-black text-red-300 uppercase tracking-[0.3em]">
                    Emergencia Activa
                  </p>
                </div>
              </div>

              {/* Operator Info Card */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 space-y-4 text-left">
                {/* Operator */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/30 rounded-2xl flex items-center justify-center">
                    <User size={24} className="text-red-300" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-red-300 uppercase tracking-widest">Operador</p>
                    <p className="text-xl font-black text-white uppercase tracking-tight">
                      {panicAlarm.operator_name || panicAlarm.triggered_by || 'Desconocido'}
                    </p>
                  </div>
                </div>

                {/* Objective */}
                {panicAlarm.objective_name && (
                  <div className="flex items-center gap-4 pt-3 border-t border-white/10">
                    <div className="w-12 h-12 bg-amber-500/30 rounded-2xl flex items-center justify-center">
                      <Shield size={24} className="text-amber-300" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-amber-300 uppercase tracking-widest">Objetivo</p>
                      <p className="text-lg font-black text-white uppercase">
                        {panicAlarm.objective_name}
                      </p>
                    </div>
                  </div>
                )}

                {/* Location */}
                {(panicAlarm.operator_latitude || panicAlarm.latitude) && (
                  <div className="flex items-center gap-4 pt-3 border-t border-white/10">
                    <div className="w-12 h-12 bg-blue-500/30 rounded-2xl flex items-center justify-center">
                      <MapPin size={24} className="text-blue-300" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Última Posición GPS</p>
                      <p className="text-sm font-mono font-bold text-white">
                        {(panicAlarm.operator_latitude || panicAlarm.latitude)?.toFixed(6)}, {(panicAlarm.operator_longitude || panicAlarm.longitude)?.toFixed(6)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Message */}
                {panicAlarm.message && (
                  <div className="pt-3 border-t border-white/10">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Mensaje</p>
                    <p className="text-sm font-bold text-white/80 italic">"{panicAlarm.message}"</p>
                  </div>
                )}

                {/* Time */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                  <Clock size={14} className="text-gray-400" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {getTimeSinceAlarm(panicAlarm.created_at)} · {panicAlarm.created_at ? new Date(panicAlarm.created_at).toLocaleTimeString('es-AR') : 'Ahora'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={dismissPanic}
                  className="flex-1 h-16 bg-white text-red-600 font-black text-sm uppercase tracking-widest rounded-2xl shadow-2xl hover:bg-red-50 transition-colors active:scale-95 flex items-center justify-center gap-3"
                >
                  <Shield size={20} />
                  Confirmar Recepción
                </button>
              </div>

              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                Esta alerta se muestra a todos los gerentes conectados
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════ STANDARD ALARM BANNERS ═══════════ */}
      {alarms.length > 0 && (
        <div className="fixed top-4 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4">
          <AnimatePresence>
            {alarms.map((alarm) => (
              <motion.div
                key={alarm.id}
                initial={{ opacity: 0, y: -50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                className="pointer-events-auto bg-red-600 border-2 border-red-400 p-4 rounded-2xl shadow-[0_0_40px_rgba(220,38,38,0.6)] flex items-center gap-4 max-w-md w-full"
              >
                <div className="bg-white rounded-full p-2 animate-pulse">
                  <AlertTriangle className="text-red-600" size={24} />
                </div>
                <div className="flex-1 text-white">
                  <h3 className="font-black uppercase tracking-widest text-sm drop-shadow-md">
                    ALERTA DE SEGURIDAD
                  </h3>
                  <p className="font-medium text-xs text-red-100 uppercase tracking-wider mt-0.5">
                    {alarm.message || `Disparado por: ${alarm.triggered_by}`}
                  </p>
                </div>
                <button
                  onClick={() => dismissAlarm(alarm.id)}
                  className="w-10 h-10 bg-black/20 hover:bg-black/40 rounded-xl flex items-center justify-center transition-colors shrink-0"
                >
                  <X size={20} className="text-white" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Sound Toggle (fixed) */}
      <button
        onClick={() => setSoundEnabled(!soundEnabled)}
        className="fixed bottom-24 right-4 z-40 w-10 h-10 bg-gray-900/80 backdrop-blur rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors shadow-lg border border-white/10"
        title={soundEnabled ? 'Silenciar alarmas' : 'Activar sonido'}
      >
        {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>
    </>
  );
}
