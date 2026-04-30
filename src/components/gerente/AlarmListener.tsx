'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, X, VolumeX, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function AlarmListener() {
  const [alarms, setAlarms] = useState<any[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    // Escuchar nuevas alarmas en tiempo real
    const channel = supabase
      .channel('global-alarms')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alarms' },
        (payload) => {
          const newAlarm = payload.new;
          setAlarms((prev) => [newAlarm, ...prev]);
          playAlarmSound();
          triggerVibration();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled]);

  const playAlarmSound = () => {
    if (!soundEnabled) return;
    try {
      // Audio fallback para navegador
      const audio = new Audio('/alarm.mp3'); // Asume que pondremos un archivo alarm.mp3 en public
      audio.play().catch(e => console.log('Audio autoplay prevented:', e));
    } catch (err) {}
  };

  const triggerVibration = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      // Patrón SOS: 3 cortos, 3 largos, 3 cortos
      navigator.vibrate([100, 30, 100, 30, 100, 200, 300, 30, 300, 30, 300, 200, 100, 30, 100, 30, 100]);
    }
  };

  const dismissAlarm = async (id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
    // Opcional: Marcar en DB como reconocida
    await supabase.from('alarms').update({ status: 'acknowledged' }).eq('id', id);
  };

  if (alarms.length === 0) return null;

  return (
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
  );
}
