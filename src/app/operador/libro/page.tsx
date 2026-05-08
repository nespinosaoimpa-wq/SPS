'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, ArrowLeft, AlertCircle, MessageSquare,
  Clock, Shield, User, MapPin, RefreshCw
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useShift } from '@/components/providers/ShiftProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';

export default function OperadorLibroPage() {
  const { isShiftActive, shiftData, theme } = useShift();
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [objectiveName, setObjectiveName] = useState('');

  const objectiveId = (shiftData as any)?.objective_id || (shiftData as any)?.current_objective_id;

  useEffect(() => {
    if (!objectiveId) {
      setLoading(false);
      return;
    }

    const fetchEntries = async () => {
      try {
        const data = await api.guardBook.list({ objective_id: objectiveId, limit: 50 });
        setEntries(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Error fetching guard book:', e);
      } finally {
        setLoading(false);
      }
    };

    // Fetch objective name
    const fetchObjective = async () => {
      try {
        const objs = await api.objectives.list();
        const obj = objs.find((o: any) => o.id === objectiveId);
        if (obj) setObjectiveName(obj.name);
      } catch (e) {}
    };

    fetchEntries();
    fetchObjective();

    // Real-time subscription for new entries on this objective
    const channel = supabase
      .channel(`op-libro-${objectiveId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'guard_book_entries', filter: `objective_id=eq.${objectiveId}` },
        (payload) => {
          setEntries(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [objectiveId]);

  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'incidente': return <AlertCircle size={18} className="text-red-500" />;
      case 'emergencia': return <Shield size={18} className="text-red-600" />;
      case 'ronda': return <RefreshCw size={18} className="text-blue-500" />;
      case 'fichaje': return <Clock size={18} className="text-green-500" />;
      default: return <MessageSquare size={18} className="text-primary" />;
    }
  };

  const getEntryColor = (type: string) => {
    switch (type) {
      case 'incidente': return 'border-red-500/20 bg-red-500/5';
      case 'emergencia': return 'border-red-600/30 bg-red-600/10';
      case 'fichaje': return 'border-green-500/20 bg-green-500/5';
      default: return theme === 'dark' ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-white';
    }
  };

  if (!isShiftActive) {
    return (
      <div className={cn("min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-8", theme === 'dark' ? "bg-black" : "bg-gray-50")}>
        <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center border border-primary/20 shadow-2xl">
          <BookOpen className="w-12 h-12 text-primary" />
        </div>
        <div className="space-y-3">
          <h2 className={cn("text-2xl font-black uppercase tracking-tighter italic", theme === 'dark' ? "text-white" : "text-gray-900")}>Libro de Guardia</h2>
          <p className="text-sm text-gray-500 font-medium max-w-xs mx-auto">
            Inicia un <span className="text-primary font-bold">turno activo</span> para acceder al libro de tu objetivo asignado.
          </p>
        </div>
        <Link href="/operador/fichaje">
          <Button className="h-14 px-8 uppercase font-black text-xs tracking-widest rounded-2xl shadow-xl shadow-primary/20">
            Iniciar Turno
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
      {/* Header */}
      <div className="max-w-md mx-auto mb-6 flex items-center justify-between">
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
              Libro de Guardia
            </h1>
            <p className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mt-0.5 flex items-center gap-1.5">
              <MapPin size={10} />
              {objectiveName || 'Objetivo Asignado'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border" style={{
          backgroundColor: theme === 'dark' ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.05)',
          borderColor: 'rgba(34,197,94,0.2)'
        }}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-black text-green-500 uppercase">En Vivo</span>
        </div>
      </div>

      {/* Entries List */}
      <div className="max-w-md mx-auto space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-gray-100 border-t-primary rounded-full animate-spin" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cargando novedades...</p>
          </div>
        ) : entries.length === 0 ? (
          <Card className={cn(
            "p-12 text-center border-2 border-dashed",
            theme === 'dark' ? "bg-zinc-900 border-white/10" : "bg-white border-gray-200"
          )}>
            <BookOpen size={48} className="text-gray-200 mx-auto mb-4" />
            <h3 className={cn("font-black uppercase text-sm", theme === 'dark' ? "text-white" : "text-gray-900")}>Sin Novedades</h3>
            <p className="text-xs text-gray-400 mt-2 max-w-xs mx-auto">
              Todavía no se registraron novedades en este objetivo durante tu turno.
            </p>
          </Card>
        ) : (
          <AnimatePresence>
            {entries.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className={cn(
                  "p-5 border rounded-3xl transition-all",
                  getEntryColor(entry.entry_type),
                  theme === 'dark' ? "shadow-none" : "shadow-md"
                )}>
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border",
                      theme === 'dark' ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100"
                    )}>
                      {getEntryIcon(entry.entry_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full",
                          entry.entry_type === 'incidente' ? "text-red-500 bg-red-500/10" :
                          entry.entry_type === 'emergencia' ? "text-red-600 bg-red-600/10" :
                          entry.entry_type === 'fichaje' ? "text-green-600 bg-green-500/10" :
                          "text-primary bg-primary/10"
                        )}>
                          {entry.entry_type || 'novedad'}
                        </span>
                        <span className={cn("text-[9px] font-bold", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
                          {entry.created_at ? new Date(entry.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className={cn(
                        "text-sm font-medium leading-relaxed",
                        theme === 'dark' ? "text-gray-200" : "text-gray-700"
                      )}>
                        {entry.content}
                      </p>
                      {entry.resource_id && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <User size={10} className="text-gray-400" />
                          <span className="text-[9px] font-bold text-gray-400 uppercase">{entry.resource_id}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
