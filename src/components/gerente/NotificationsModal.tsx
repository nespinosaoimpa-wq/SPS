'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ShieldAlert, AlertTriangle, Activity, CheckCircle2, X, ChevronRight, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface NotificationItem {
  id: string;
  created_at?: string;
  content?: string;
  entry_type?: string;
  urgency?: string;
  operator_name?: string;
  objective_name?: string;
  resource_name?: string;
  status?: string;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidents: NotificationItem[];
  onResolveIncident?: (id: string) => void;
}

export default function NotificationsModal({
  isOpen,
  onClose,
  incidents = [],
  onResolveIncident
}: NotificationsModalProps) {
  if (!isOpen) return null;

  const activeIncidents = incidents.filter(i => i.status !== 'resolved' && i.status !== 'resuelto');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-start justify-end p-4 sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, x: 50, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 50, scale: 0.95 }}
          className="w-full max-w-md bg-zinc-950 border-2 border-white/10 text-white rounded-3xl shadow-2xl overflow-hidden mt-16 sm:mt-12 flex flex-col max-h-[80vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 bg-zinc-900 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl flex items-center justify-center text-[#D4AF37]">
                <Bell size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight text-white italic">
                  Centro de Notificaciones
                </h3>
                <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mt-0.5">
                  {activeIncidents.length} alertas tácticas en vivo
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            {activeIncidents.length === 0 ? (
              <div className="p-12 text-center space-y-3 border border-dashed border-white/10 rounded-2xl">
                <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
                <p className="text-xs font-black uppercase text-zinc-300">Puesto Operativo Estable</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase">No hay alertas críticas pendientes en el radar</p>
              </div>
            ) : (
              activeIncidents.map((inc) => {
                const isPanic = inc.entry_type === 'panic' || inc.entry_type === 'emergencia' || inc.urgency === 'critica';
                const isHombreVivo = (inc.entry_type || '').includes('hombre_vivo') || (inc.content || '').toLowerCase().includes('hombre vivo');

                return (
                  <div
                    key={inc.id}
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex flex-col gap-2",
                      isPanic ? "bg-red-500/10 border-red-500/30" : isHombreVivo ? "bg-amber-500/10 border-amber-500/30" : "bg-zinc-900 border-white/5"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider flex items-center gap-1",
                        isPanic ? "bg-red-600 text-white" : isHombreVivo ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-300"
                      )}>
                        {isPanic ? <ShieldAlert size={10} /> : isHombreVivo ? <Activity size={10} /> : <AlertTriangle size={10} />}
                        {isPanic ? 'CRÍTICA' : isHombreVivo ? 'HOMBRE VIVO' : 'NOVEDAD'}
                      </span>
                      {inc.created_at && (
                        <span className="text-[9px] font-mono font-bold text-zinc-500">
                          {new Date(inc.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} HS
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-bold text-zinc-200 leading-snug">
                      {inc.content || 'Alerta táctica registrada'}
                    </p>

                    <div className="flex items-center justify-between text-[9px] font-bold text-zinc-400 uppercase pt-2 border-t border-white/5">
                      <span className="truncate">
                        👤 {inc.operator_name || inc.resource_name || 'Operador'}
                      </span>
                      {onResolveIncident && (
                        <button
                          onClick={() => onResolveIncident(inc.id)}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                        >
                          Resolver
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Quick Links */}
          <div className="p-4 bg-zinc-900 border-t border-white/10 grid grid-cols-2 gap-2 text-center">
            <a
              href="/gerente/hombre-vivo"
              className="py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-[#D4AF37] rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
            >
              <Activity size={12} /> Control Hombre Vivo
            </a>
            <a
              href="/gerente/libro"
              className="py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
            >
              Libro de Guardia <ChevronRight size={12} />
            </a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
