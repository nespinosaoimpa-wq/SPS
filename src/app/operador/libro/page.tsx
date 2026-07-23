'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Book, ArrowLeft, Search, Shield, Calendar, Clock,
  AlertTriangle, CheckCircle2, Info, Filter, Send, Loader2,
  AlertCircle, MessageSquare, Zap, RefreshCw, Globe
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useShift } from '@/components/providers/ShiftProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// ─── Tipos de novedad ────────────────────────────────────────────────────────
const ENTRY_TYPES = [
  { id: 'novedad',   label: 'Novedad',   color: 'text-blue-500',   bg: 'bg-blue-500/10',   border: 'border-blue-200', icon: Info },
  { id: 'incidente', label: 'Incidente', color: 'text-amber-500',  bg: 'bg-amber-500/10',  border: 'border-amber-200', icon: Shield },
  { id: 'emergencia',label: 'Emergencia',color: 'text-red-500',    bg: 'bg-red-500/10',    border: 'border-red-200',  icon: AlertTriangle },
  { id: 'ronda',     label: 'Ronda',     color: 'text-emerald-500',bg: 'bg-emerald-500/10',border: 'border-emerald-200', icon: Clock },
] as const;

type EntryTypeId = (typeof ENTRY_TYPES)[number]['id'];

// ─── Helper ──────────────────────────────────────────────────────────────────
const getTypeConfig = (type: string) =>
  ENTRY_TYPES.find((t) => t.id === type) ?? ENTRY_TYPES[0];

// ─── Component ───────────────────────────────────────────────────────────────
export default function GuardBookPage() {
  const { isShiftActive, shiftData, theme } = useShift();
  const { user } = useAuth();

  const objectiveId =
    (shiftData as any)?.objective_id || (shiftData as any)?.current_objective_id;
  const resourceId  =
    (shiftData as any)?.operator_id  || (shiftData as any)?.resource_id;

  const [entries,      setEntries]      = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [activeFilter, setActiveFilter] = useState<EntryTypeId | 'all'>('all');
  const [filterDate,   setFilterDate]   = useState('');

  // ── Form State ──────────────────────────────────────────────────────────
  const [newContent,   setNewContent]   = useState('');
  const [newType,      setNewType]      = useState<EntryTypeId>('novedad');
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState<string | null>(null);

  // ── Fetch Entries ────────────────────────────────────────────────────────
  const fetchEntries = async () => {
    if (!objectiveId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('objective_id', objectiveId);
      if (filterDate) params.set('date', filterDate);
      params.set('limit', '200');

      const res = await fetch(`/api/guard-book?${params}`);
      if (!res.ok) throw new Error('Error al cargar libro de guardia');
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[GuardBook] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();

    if (!objectiveId) return;

    // Realtime — new entries appear instantly
    const channel = supabase
      .channel(`guard-book-operator-${objectiveId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'guard_book_entries',
        filter: `objective_id=eq.${objectiveId}`,
      }, () => {
        fetchEntries();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [objectiveId, filterDate]);

  // ── Submit new entry ─────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || !objectiveId) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/guard-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective_id: objectiveId,
          resource_id:  resourceId || user?.id,
          entry_type:   newType,
          content:      newContent.trim(),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Error al guardar novedad');
      }

      setNewContent('');
      fetchEntries();
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filtered entries ────────────────────────────────────────────────────
  const filtered = entries.filter((e) => {
    const matchType = activeFilter === 'all' || e.entry_type === activeFilter;
    const q = searchQuery.toLowerCase();
    const matchQuery =
      !q ||
      e.content?.toLowerCase().includes(q) ||
      e.resources?.name?.toLowerCase().includes(q);
    return matchType && matchQuery;
  });

  return (
    <div
      className={cn(
        'min-h-screen pb-32 transition-colors duration-500',
        theme === 'dark' ? 'bg-[#0a0a0a] text-white' : 'bg-gray-50 text-gray-900'
      )}
    >
      {/* ── Top Header ── */}
      <div
        className={cn(
          'p-6 pb-10 rounded-b-[2.5rem] shadow-xl relative overflow-hidden transition-colors',
          theme === 'dark' ? 'bg-zinc-900 border-b border-white/5' : 'bg-gray-900 text-white'
        )}
      >
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <Link
              href="/operador"
              className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} /> Volver al Inicio
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase text-emerald-400">Canal Directo Con Control</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Book size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight italic">
                Libro de Guardia e Instrucciones
              </h1>
              <p className="text-xs text-gray-400 font-medium">
                Novedades del Puesto · Órdenes de Gerencia e Incidentes en Vivo
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-4 -mt-4 relative z-10 space-y-6">
        {/* ── New Entry Form ── */}
        <Card
          className={cn(
            'p-5 border shadow-2xl rounded-3xl transition-colors',
            theme === 'dark' ? 'bg-zinc-900/90 border-white/10' : 'bg-white border-gray-200'
          )}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-gray-400">
                Escribir Novedad u Observación
              </span>
              <div className="flex gap-1.5 overflow-x-auto">
                {ENTRY_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setNewType(t.id)}
                    className={cn(
                      'px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 border',
                      newType === t.id
                        ? `${t.bg} ${t.color} ${t.border}`
                        : 'border-transparent text-gray-400 hover:text-gray-200'
                    )}
                  >
                    <t.icon size={12} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Escribí tu novedad del servicio aquí..."
              rows={3}
              className={cn(
                'w-full p-4 rounded-2xl text-sm font-medium border resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all',
                theme === 'dark'
                  ? 'bg-zinc-950 border-white/10 text-white placeholder-gray-600'
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
              )}
            />

            {submitError && (
              <p className="text-xs text-red-500 font-bold">{submitError}</p>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={submitting || !newContent.trim()}
                className="h-11 px-6 rounded-2xl font-black text-xs uppercase tracking-widest bg-primary text-black hover:bg-primary/90 flex items-center gap-2 shadow-lg disabled:opacity-40"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                <span>Enviar Novedad</span>
              </Button>
            </div>
          </form>
        </Card>

        {/* ── Search and Filter Controls ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en el libro de guardia..."
              className={cn(
                'w-full h-11 pl-11 pr-4 rounded-2xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-primary/30',
                theme === 'dark'
                  ? 'bg-zinc-900 border-white/10 text-white placeholder-gray-600'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
              )}
            />
          </div>

          <div className="flex gap-2">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className={cn(
                'h-11 px-3 rounded-2xl text-xs font-bold border focus:outline-none',
                theme === 'dark' ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'
              )}
            />

            <button
              onClick={fetchEntries}
              className={cn(
                'h-11 w-11 flex items-center justify-center rounded-2xl border shrink-0',
                theme === 'dark' ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'
              )}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* ── Entries Timeline ── */}
        <div className="space-y-3">
          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin text-primary" /> Cargando novedades...
            </div>
          ) : filtered.length === 0 ? (
            <Card
              className={cn(
                'p-12 text-center border-dashed rounded-3xl space-y-3',
                theme === 'dark' ? 'bg-zinc-900/40 border-white/10' : 'bg-white border-gray-200'
              )}
            >
              <Book size={40} className="mx-auto text-gray-400" />
              <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                Sin novedades registradas
              </p>
            </Card>
          ) : (
            filtered.map((entry) => {
              const typeCfg = getTypeConfig(entry.entry_type);
              const isManager = (entry.content || '').includes('[GERENTE]');
              const dateObj = new Date(entry.created_at);

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'p-5 rounded-3xl border shadow-lg space-y-3 relative overflow-hidden transition-all',
                    isManager
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : theme === 'dark'
                      ? 'bg-zinc-900/80 border-white/10'
                      : 'bg-white border-gray-200'
                  )}
                >
                  {isManager && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border',
                          isManager
                            ? 'bg-amber-500 text-black border-amber-400'
                            : `${typeCfg.bg} ${typeCfg.color} ${typeCfg.border}`
                        )}
                      >
                        <typeCfg.icon size={12} />
                        {isManager ? '📌 INSTRUCCIÓN GERENCIA' : typeCfg.label}
                      </span>

                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                        {entry.resources?.name || (isManager ? 'Control Operativo' : 'Guardia')}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono font-bold text-gray-400">
                      {dateObj.toLocaleDateString('es-AR')} {dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                    </span>
                  </div>

                  <p className={cn('text-sm font-bold leading-relaxed', isManager ? 'text-amber-200' : theme === 'dark' ? 'text-white' : 'text-gray-900')}>
                    {entry.content}
                  </p>

                  {entry.image_url && (
                    <a
                      href={entry.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-black text-primary underline pt-1"
                    >
                      📷 Ver Fotografía Adjunta
                    </a>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
