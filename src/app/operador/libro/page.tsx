'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Book, 
  ArrowLeft, 
  Search, 
  Shield, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';
import { useShift } from '@/components/providers/ShiftProvider';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export default function GuardBookPage() {
  const { isShiftActive, shiftData, theme } = useShift();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const objectiveId = (shiftData as any)?.objective_id || (shiftData as any)?.current_objective_id;

  useEffect(() => {
    if (!objectiveId) {
      setLoading(false);
      return;
    }

    const fetchEntries = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('guard_book_entries')
          .select('*')
          .eq('objective_id', objectiveId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        setEntries(data || []);
      } catch (err) {
        console.error("Error fetching guard book:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();

    // Subscribe to new entries for real-time updates
    const channel = supabase
      .channel('guard-book-live')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'guard_book_entries',
        filter: `objective_id=eq.${objectiveId}`
      }, (payload) => {
        setEntries(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [objectiveId]);

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'all' 
      || (activeFilter === 'emergencia' && entry.entry_type === 'emergencia')
      || (activeFilter === 'incidente' && entry.entry_type === 'incidente')
      || (activeFilter === 'ronda' && entry.entry_type === 'ronda');
    return matchesSearch && matchesFilter;
  });

  if (!isShiftActive) {
    return (
      <div className={cn("min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-8", theme === 'dark' ? "bg-black" : "bg-gray-50")}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center border border-primary/20 shadow-2xl">
          <Book className="w-12 h-12 text-primary" />
        </motion.div>
        <div className="space-y-3">
          <h2 className={cn("text-2xl font-black uppercase tracking-tighter italic", theme === 'dark' ? "text-white" : "text-gray-900")}>Acceso Restringido</h2>
          <p className="text-sm text-gray-500 font-medium max-w-xs mx-auto">
            Debe tener un <span className="text-primary font-bold">turno activo</span> para consultar el Libro de Guardia de su objetivo.
          </p>
        </div>
        <Link href="/operador">
          <Button className="h-14 px-8 uppercase font-black text-xs tracking-widest rounded-2xl shadow-xl shadow-primary/20">Volver</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen p-5 pb-32 transition-colors duration-500", theme === 'dark' ? "bg-[#0a0a0a]" : "bg-gray-50")}>
      {/* Header */}
      <div className="max-w-md mx-auto mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/operador">
            <button className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-90", theme === 'dark' ? "bg-zinc-900/80 border border-white/5 text-white" : "bg-white border border-gray-100 text-gray-900")}>
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div>
            <h1 className={cn("text-xl font-black uppercase tracking-tighter italic", theme === 'dark' ? "text-white" : "text-gray-900")}>Libro de Guardia</h1>
            <p className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mt-0.5">Control de Objetivo</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Search and Filter */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar en el historial..."
              className={cn(
                "w-full h-14 pl-12 pr-4 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 transition-all",
                theme === 'dark' ? "bg-zinc-900/60 border border-white/5 text-white focus:ring-primary/20" : "bg-white border border-gray-100 text-gray-900 focus:ring-primary/20"
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {['all', 'emergencia', 'incidente', 'ronda'].map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                  activeFilter === filter 
                    ? "bg-primary text-black border-primary" 
                    : (theme === 'dark' ? "bg-zinc-900/40 text-gray-500 border-white/5" : "bg-white text-gray-500 border-gray-100")
                )}
              >
                {filter === 'all' ? 'Todos' : filter}
              </button>
            ))}
          </div>
        </div>

        {/* Entries List */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Sincronizando Archivos...</p>
            </div>
          ) : filteredEntries.length > 0 ? (
            filteredEntries.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className={cn(
                  "p-5 border-none shadow-xl relative overflow-hidden group",
                  theme === 'dark' ? "bg-zinc-900/60 backdrop-blur-md" : "bg-white"
                )}>
                  <div className={cn(
                    "absolute top-0 left-0 w-1 h-full",
                    entry.entry_type === 'emergencia' ? "bg-red-600" :
                    entry.entry_type === 'incidente' ? "bg-amber-500" :
                    entry.entry_type === 'ronda' ? "bg-blue-500" : "bg-primary"
                  )} />

                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                       <div className={cn(
                         "p-1.5 rounded-lg",
                         entry.entry_type === 'emergencia' ? "bg-red-500/10 text-red-500" :
                         entry.entry_type === 'incidente' ? "bg-amber-500/10 text-amber-500" :
                         entry.entry_type === 'ronda' ? "bg-blue-500/10 text-blue-500" : "bg-primary/10 text-primary"
                       )}>
                         {entry.entry_type === 'emergencia' ? <AlertTriangle size={14} /> :
                          entry.entry_type === 'incidente' ? <Shield size={14} /> :
                          entry.entry_type === 'ronda' ? <Clock size={14} /> : <Info size={14} />}
                       </div>
                       <span className={cn(
                         "text-[9px] font-black uppercase tracking-widest",
                         theme === 'dark' ? "text-gray-400" : "text-gray-500"
                       )}>
                         {entry.entry_type} — {new Date(entry.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                       </span>
                    </div>
                    <span className="text-[9px] font-mono text-gray-500">
                      {new Date(entry.created_at).toLocaleDateString('es-AR')}
                    </span>
                  </div>

                  <p className={cn(
                    "text-sm font-medium leading-relaxed",
                    theme === 'dark' ? "text-gray-200" : "text-gray-800"
                  )}>
                    {entry.content}
                  </p>

                  {entry.is_resolved && (
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-green-500" />
                      <span className="text-[10px] font-bold text-green-500 uppercase tracking-tight">Gestionado por Gerencia</span>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))
          ) : (
            <div className="py-20 text-center space-y-4">
              <Book size={48} className="text-gray-300 mx-auto opacity-20" />
              <p className="text-sm text-gray-500 font-bold uppercase tracking-widest italic">No se registran novedades</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
