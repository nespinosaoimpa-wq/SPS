'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { playAlertTone } from '@/lib/push-notifications';
import { Button } from '@/components/ui/Button';

interface HombreVivoCheckModalProps {
  operatorId?: string;
  objectiveId?: string | null;
  location?: { lat: number; lng: number } | null;
  isShiftActive: boolean;
}

export default function HombreVivoCheckModal({
  operatorId,
  objectiveId,
  location,
  isShiftActive
}: HombreVivoCheckModalProps) {
  const [activeCheck, setActiveCheck] = useState<any | null>(null);
  const [countdown, setCountdown] = useState(180); // 3 minutes to respond
  const [isAnswering, setIsAnswering] = useState(false);
  const [answeredSuccess, setAnsweredSuccess] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isShiftActive || !operatorId) return;

    // Listen for manual check requests or periodic checks for this operator/objective
    const channel = supabase
      .channel(`hombre-vivo-op-${operatorId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'alarms',
        filter: `alarm_type=eq.hombre_vivo_solicitud`
      }, (payload) => {
        const newAlarm = payload.new as any;
        if (newAlarm.operator_id === operatorId || !newAlarm.operator_id) {
          triggerCheckModal(newAlarm);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isShiftActive, operatorId]);

  const triggerCheckModal = (alarm: any) => {
    setActiveCheck(alarm);
    setCountdown(180);
    setAnsweredSuccess(false);
    playAlertTone('normal');

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 400]);
    }

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeExpired(alarm);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeExpired = async (alarm: any) => {
    try {
      // Operator failed to respond within time limit -> Trigger Unattended Alert
      let lat = location?.lat || 0;
      let lng = location?.lng || 0;

      await supabase.from('alarms').insert({
        triggered_by: 'system_timeout',
        operator_id: operatorId,
        objective_id: objectiveId || null,
        alarm_type: 'hombre_vivo_sin_respuesta',
        severity: 'critica',
        message: `🚨 HOMBRE VIVO NO ATENDIDO: El operador no respondió la verificación dentro de los 3 minutos límite.`,
        latitude: lat,
        longitude: lng,
        status: 'active',
        created_at: new Date().toISOString()
      });

      await supabase.from('guard_book_entries').insert({
        objective_id: objectiveId || null,
        operator_id: operatorId,
        entry_type: 'hombre_vivo_sin_respuesta',
        content: `🚨 HOMBRE VIVO SIN RESPONDER - LÍMITE DE TIEMPO EXCEDIDO (3 min)`,
        latitude: lat,
        longitude: lng,
        urgency: 'critica'
      });

      // Mark original request as timeout
      if (alarm?.id) {
        await supabase.from('alarms').update({ status: 'unattended' }).eq('id', alarm.id);
      }
    } catch (e) {
      console.error('[HombreVivoModal] Timeout error:', e);
    }
  };

  const handleConfirmPresence = async () => {
    if (!activeCheck) return;
    try {
      setIsAnswering(true);
      if (timerRef.current) clearInterval(timerRef.current);

      let lat = location?.lat || 0;
      let lng = location?.lng || 0;

      // 1. Log answered check in guard book
      await supabase.from('guard_book_entries').insert({
        objective_id: objectiveId || null,
        operator_id: operatorId,
        entry_type: 'hombre_vivo',
        content: `✅ CONTROL HOMBRE VIVO RESPONDIDO OK - PRESENCIA CONFIRMADA`,
        latitude: lat,
        longitude: lng,
        urgency: 'normal'
      });

      // 2. Mark alarm request as acknowledged
      if (activeCheck.id) {
        await supabase.from('alarms').update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString()
        }).eq('id', activeCheck.id);
      }

      setAnsweredSuccess(true);
      setTimeout(() => {
        setActiveCheck(null);
        setIsAnswering(false);
      }, 1500);
    } catch (e) {
      console.error('[HombreVivoModal] Answer error:', e);
    } finally {
      setIsAnswering(false);
    }
  };

  if (!activeCheck) return null;

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center"
      >
        <motion.div
          initial={{ scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 20 }}
          className="bg-zinc-950 border-2 border-amber-500/40 p-8 rounded-[3.5rem] max-w-sm w-full shadow-[0_0_80px_rgba(245,158,11,0.3)] flex flex-col items-center relative overflow-hidden"
        >
          {answeredSuccess ? (
            <>
              <div className="w-24 h-24 bg-emerald-500/20 border-2 border-emerald-500 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.5)]">
                <CheckCircle2 size={48} className="text-emerald-500" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-1">
                PRESENCIA CONFIRMADA
              </h2>
              <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest">
                Protocolo Hombre Vivo Sincronizado
              </p>
            </>
          ) : (
            <>
              <div className="w-24 h-24 bg-amber-500/20 border-2 border-amber-500 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(245,158,11,0.4)] animate-bounce">
                <Activity size={48} className="text-amber-500" />
              </div>

              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 mb-1">
                Verificación de Guardia
              </span>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">
                CONTROL DE HOMBRE VIVO
              </h2>
              <p className="text-xs text-zinc-400 font-medium mb-6">
                Gerencia solicita tu confirmación de presencia en el objetivo.
              </p>

              {/* Countdown Display */}
              <div className="w-28 h-14 bg-zinc-900 border border-amber-500/30 text-amber-400 font-mono font-black text-2xl rounded-2xl flex items-center justify-center mb-8 shadow-inner">
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </div>

              <Button
                onClick={handleConfirmPresence}
                disabled={isAnswering}
                className="w-full h-18 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-widest text-xs shadow-xl shadow-amber-500/30"
              >
                {isAnswering ? 'Registrando...' : '✅ DAR PRESENTE HOMBRE VIVO'}
              </Button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
