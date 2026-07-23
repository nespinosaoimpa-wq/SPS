'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Search, Download, Clock, User, MapPin, AlertTriangle,
  Calendar, CheckCircle2, ChevronRight, ShieldCheck, FileText, Zap,
  RefreshCw, Building2, Filter, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import DailyScorecard from '@/components/gerente/DailyScorecard';

// ─── Severity Config ──────────────────────────────────────────────────────────
const SEVERITY: Record<string, {
  bar: string; badge: string; badgeText: string; label: string; dot: string;
}> = {
  critica:  { bar: 'bg-red-500',    badge: 'bg-red-50 border-red-200',    badgeText: 'text-red-600',    label: 'CRÍTICA',  dot: 'bg-red-500' },
  alta:     { bar: 'bg-orange-500', badge: 'bg-orange-50 border-orange-200', badgeText: 'text-orange-600', label: 'ALTA',     dot: 'bg-orange-500' },
  media:    { bar: 'bg-amber-400',  badge: 'bg-amber-50 border-amber-200', badgeText: 'text-amber-600',  label: 'MEDIA',    dot: 'bg-amber-400' },
  baja:     { bar: 'bg-blue-500',   badge: 'bg-blue-50 border-blue-200',   badgeText: 'text-blue-600',   label: 'BAJA',     dot: 'bg-blue-500' },
  normal:   { bar: 'bg-zinc-200',   badge: 'bg-zinc-50 border-zinc-200',       badgeText: 'text-zinc-500',   label: 'NORMAL',   dot: 'bg-zinc-400' },
};

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; barColor: string; label: string }> = {
  fichaje:      { icon: <CheckCircle2 size={16} />, barColor: 'bg-emerald-500', label: 'Fichaje' },
  incidente:    { icon: <AlertTriangle size={16} />, barColor: 'bg-red-500',    label: 'Incidente' },
  emergencia:   { icon: <Zap size={16} />,           barColor: 'bg-red-600',    label: 'Emergencia' },
  novedad:      { icon: <FileText size={16} />,      barColor: 'bg-[#D4AF37]',  label: 'Novedad' },
  alerta:       { icon: <AlertTriangle size={16} />, barColor: 'bg-amber-500',  label: 'Alerta' },
  libro_guardia:{ icon: <FileText size={16} />,      barColor: 'bg-blue-500',   label: 'Guardia' },
  ronda:        { icon: <ShieldCheck size={16} />,   barColor: 'bg-purple-500', label: 'Ronda' },
  inventario:   { icon: <Building2 size={16} />,     barColor: 'bg-zinc-500',   label: 'Inventario' },
};

// ─── Avatar Helper ────────────────────────────────────────────────────────────
function OperatorAvatar({ name, url }: { name?: string; url?: string | null }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="w-10 h-10 rounded-full object-cover border-2 border-white/10 shadow-lg shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 border-2 border-[#D4AF37]/30 flex items-center justify-center shrink-0 shadow-lg">
      <span className="text-[11px] font-black text-[#D4AF37] tracking-tight">{initials}</span>
    </div>
  );
}

// ─── Enriched CSV Export ──────────────────────────────────────────────────────
function buildTacticalCSV(entries: any[], dateFilter: string) {
  const dateStr = dateFilter || new Date().toISOString().split('T')[0];
  const now = new Date().toLocaleString('es-AR');

  const firstTs = entries.length > 0
    ? new Date(entries[entries.length - 1].created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : '--:--';
  const lastTs = entries.length > 0
    ? new Date(entries[0].created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  const critCount = entries.filter(e => e.urgency === 'critica' || e.entry_type === 'emergencia').length;
  const incidentCount = entries.filter(e => e.entry_type === 'incidente').length;
  const checkinCount = entries.filter(e => e.entry_type === 'fichaje').length;

  const header = [
    '========================================================',
    'SPS 704 OS - INFORME DE CUMPLIMIENTO TÁCTICO',
    `Fecha: ${dateStr}  |  Exportado: ${now}`,
    `Período: ${firstTs} - ${lastTs}  |  Total eventos: ${entries.length}`,
    `Alertas Críticas: ${critCount}  |  Incidentes: ${incidentCount}  |  Fichajes: ${checkinCount}`,
    '========================================================',
    '',
  ].join('\n');

  const cols = [
    'Fecha/Hora', 'Categoría', 'Severidad', 'Objetivo', 'Dirección Objetivo',
    'Operador', 'Rol', 'Descripción', 'Latitud', 'Longitud'
  ];

  const rows = entries.map(e => [
    new Date(e.created_at).toLocaleString('es-AR'),
    TYPE_CONFIG[e.entry_type]?.label || e.entry_type || 'Evento',
    SEVERITY[e.urgency || 'normal']?.label || 'NORMAL',
    e.objectives?.name || 'Objetivo General',
    e.objectives?.address || '',
    e.resources?.name || e.resource_id || 'Sin identificar',
    e.resources?.role || '',
    `"${(e.content || '').replace(/"/g, '""')}"`,
    e.latitude ?? '',
    e.longitude ?? '',
  ].join(','));

  const footer = [
    '',
    '========================================================',
    `Generado por SPS 704 OS · ${now}`,
    'Documento confidencial — uso interno exclusivo',
    '========================================================',
  ].join('\n');

  return header + [cols.join(','), ...rows].join('\n') + footer;
}

// ─── Duración de Abandono ───────────────────────────────────────────
function AbandonDuration({ seconds }: { seconds?: number | null }) {
  if (seconds === undefined || seconds === null) {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse inline-block" />
        En curso...
      </span>
    );
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const label = seconds < 60
    ? 'Desvío breve'
    : `Abandono: ${mins}m ${secs}s`;

  return (
    <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${
      seconds < 60
        ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
        : 'text-red-400 bg-red-500/10 border-red-500/20'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full inline-block ${seconds < 60 ? 'bg-amber-400' : 'bg-red-500 animate-ping'}`} />
      {label}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GuardBookPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterObjective, setFilterObjective] = useState('all');
  const [objectives, setObjectives] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newEntryFlash, setNewEntryFlash] = useState<string | null>(null);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFilter && dateFilter !== 'all') params.set('date', dateFilter);
      if (filterObjective !== 'all') params.set('objective_id', filterObjective);
      params.set('limit', '200');

      const [entriesRes, objRes] = await Promise.all([
        fetch(`/api/guard-book?${params}`).then(r => r.json()),
        fetch('/api/objectives').then(r => r.json()),
      ]);

      setEntries(Array.isArray(entriesRes) ? entriesRes : []);
      setObjectives(Array.isArray(objRes) ? objRes : []);
    } catch (err) {
      console.error('Error fetching guard book:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();

    const channel = supabase
      .channel('libro-gerente-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guard_book_entries' }, async () => {
        fetchEntries();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dateFilter, filterObjective]);

  const filteredEntries = useMemo(() => entries.filter(e => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q ||
      (e.content?.toLowerCase() || '').includes(q) ||
      (e.resources?.name?.toLowerCase() || '').includes(q) ||
      (e.objectives?.name?.toLowerCase() || '').includes(q);
    const matchType = filterType === 'all' || e.entry_type === filterType;
    return matchSearch && matchType;
  }), [entries, searchTerm, filterType]);

  const handleExport = () => {
    const csv = buildTacticalCSV(filteredEntries, dateFilter);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `REPORTE_CUMPLIMIENTO_704_${dateFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8 bg-zinc-50 min-h-screen text-zinc-900 pb-32 font-sans">

      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center shadow-sm">
            <BookOpen size={28} className="text-zinc-950" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase text-zinc-950">Libro de Guardia</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 bg-[#D4AF37] rounded-full animate-pulse inline-block" />
              <span className="text-[11px] font-black text-zinc-600 uppercase tracking-widest">
                {filteredEntries.length} registros operativos · auditoría digital en vivo
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setDateFilter(new Date().toISOString().split('T')[0])}
            className={cn(
              "h-10 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border",
              dateFilter === new Date().toISOString().split('T')[0]
                ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
            )}
          >
            Hoy
          </button>
          <button
            onClick={() => setDateFilter('all')}
            className={cn(
              "h-10 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-1.5",
              dateFilter === 'all'
                ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
            )}
          >
            <Globe size={13} /> Todo el Historial
          </button>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input
              type="date"
              className="bg-white border border-zinc-200 rounded-xl h-10 pl-9 pr-3 text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 shadow-sm uppercase tracking-wider"
              value={dateFilter === 'all' ? '' : dateFilter}
              onChange={e => setDateFilter(e.target.value || 'all')}
            />
          </div>

          <button onClick={fetchEntries} className="h-10 w-10 flex items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 transition-all shadow-sm">
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleExport}
            className="h-10 px-4 rounded-xl text-xs font-black uppercase tracking-widest gap-2 bg-[#D4AF37] text-zinc-950 hover:bg-[#b8952b] transition-all flex items-center justify-center shadow-md"
          >
            <Download size={15} /> Exportar Excel
          </button>
        </div>
      </div>

      {/* ─── Daily Scorecard ─── */}
      <DailyScorecard entries={entries} totalObjectives={objectives.length} />

      {/* ─── Filters ─── */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="BUSCAR POR OPERADOR, OBJETIVO O DESCRIPCIÓN..."
            className="w-full h-11 bg-zinc-50 border border-zinc-200 rounded-xl pl-11 pr-4 text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 text-zinc-900 placeholder:text-zinc-400"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 px-3 border-l border-zinc-100">
          <Building2 size={15} className="text-zinc-400 shrink-0" />
          <select
            value={filterObjective}
            onChange={e => setFilterObjective(e.target.value)}
            className="text-xs font-bold uppercase bg-transparent border-none focus:outline-none text-zinc-800 cursor-pointer"
          >
            <option value="all">Todos los objetivos</option>
            {objectives.map((o: any) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        <div className="flex p-1 bg-zinc-50 rounded-xl gap-1 flex-wrap shrink-0">
          {(['all', 'fichaje', 'incidente', 'emergencia', 'novedad', 'ronda'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all',
                filterType === type ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              )}
            >
              {type === 'all' ? 'Todo' : type}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Timeline Feed ─── */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-16 flex flex-col items-center gap-3 bg-white rounded-2xl border border-zinc-200">
            <div className="w-8 h-8 border-3 border-zinc-200 border-t-[#D4AF37] rounded-full animate-spin" />
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Sincronizando entradas de guardia...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-zinc-200 border-dashed space-y-4">
            <BookOpen size={44} className="text-zinc-300 mx-auto" />
            <div>
              <h3 className="text-base font-black text-zinc-900 uppercase tracking-tight">Sin registros en esta fecha</h3>
              <p className="text-zinc-500 text-xs font-semibold mt-1">No hay entradas para el filtro de fecha actual ({dateFilter === 'all' ? 'Todo' : dateFilter}).</p>
            </div>
            {dateFilter !== 'all' && (
              <button
                onClick={() => setDateFilter('all')}
                className="px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all inline-flex items-center gap-2"
              >
                <Globe size={14} /> Ver Todo el Historial Registrado
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((e: any) => {
              const typeCfg = TYPE_CONFIG[e.entry_type] || { icon: <FileText size={16} />, barColor: 'bg-zinc-400', label: e.entry_type };
              const sev = SEVERITY[e.urgency || 'normal'] || SEVERITY.normal;
              const dateObj = new Date(e.created_at);

              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#D4AF37]/40 transition-all"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <OperatorAvatar name={e.resources?.name} url={e.resources?.avatar_url} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-zinc-950 text-sm uppercase tracking-tight">{e.resources?.name || 'Operador'}</span>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">· {e.objectives?.name || 'Puesto General'}</span>
                        <span className={cn('px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1', sev.badge, sev.badgeText)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', sev.dot)} />
                          {sev.label}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-zinc-800 leading-relaxed">
                        {e.content}
                      </p>

                      {e.image_url && (
                        <div className="pt-2">
                          <a href={e.image_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#D4AF37] uppercase bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg hover:bg-amber-500/20 transition-all">
                            📷 Ver Fotografía Adjunta
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 border-zinc-100 pt-3 sm:pt-0 shrink-0 text-right">
                    <span className="text-xs font-mono font-black text-zinc-900">
                      {dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 font-bold">
                      {dateObj.toLocaleDateString('es-AR')}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
