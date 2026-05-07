'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Search, 
  Filter, 
  Download, 
  Clock, 
  User, 
  MapPin, 
  AlertTriangle, 
  Calendar,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  FileText,
  Zap,
  RefreshCw,
  Building2
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const URGENCY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  critica: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'CRÍTICA' },
  alta:    { color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200', label: 'ALTA' },
  media:   { color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200', label: 'MEDIA' },
  baja:    { color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200', label: 'BAJA' },
  normal:  { color: 'text-gray-400', bg: 'bg-gray-50 border-gray-100', label: 'NORMAL' },
};

export default function GuardBookPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterObjective, setFilterObjective] = useState('all');
  const [objectives, setObjectives] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [newEntryFlash, setNewEntryFlash] = useState<string | null>(null);

  useEffect(() => {
    fetchEntries();

    // Real-time subscription — new entries appear instantly
    const channel = supabase
      .channel('libro-gerente-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guard_book_entries' }, (payload) => {
        const entry = payload.new as any;
        setEntries(prev => [entry, ...prev]);
        setNewEntryFlash(entry.id);
        setTimeout(() => setNewEntryFlash(null), 4000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dateFilter]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFilter) params.set('date', dateFilter);
      if (filterObjective !== 'all') params.set('objective_id', filterObjective);
      params.set('limit', '200');

      const [entriesRes, objRes] = await Promise.all([
        fetch(`/api/guard-book?${params}`).then(r => r.json()),
        fetch('/api/objectives').then(r => r.json()),
      ]);

      setEntries(Array.isArray(entriesRes) ? entriesRes : []);
      setObjectives(Array.isArray(objRes) ? objRes : []);
    } catch (err: any) {
      console.error('Error fetching guard book:', err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when objective filter changes
  useEffect(() => { fetchEntries(); }, [filterObjective]);

  const filteredEntries = entries.filter(e => {
    const matchesSearch = 
      (e.content?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (e.resources?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (e.objectives?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || e.entry_type === filterType;
    return matchesSearch && matchesType;
  });

  const getEntryIcon = (type: string, urgency: string) => {
    if (urgency === 'critica') return <Zap className="text-red-600 animate-pulse" size={18} />;
    switch (type) {
      case 'incidente':    return <AlertTriangle className="text-red-500" size={18} />;
      case 'emergencia':  return <Zap className="text-red-600" size={18} />;
      case 'fichaje':     return <CheckCircle2 className="text-green-500" size={18} />;
      case 'libro_guardia': return <FileText className="text-blue-500" size={18} />;
      case 'ronda':       return <ShieldCheck className="text-amber-500" size={18} />;
      default:            return <Clock className="text-gray-400" size={18} />;
    }
  };

  const handleExport = () => {
    const csv = [
      ['Fecha/Hora', 'Tipo', 'Urgencia', 'Objetivo', 'Operador', 'Contenido', 'Lat', 'Lng'].join(','),
      ...filteredEntries.map(e => [
        new Date(e.created_at).toLocaleString('es-AR'),
        e.entry_type,
        e.urgency || 'normal',
        e.objectives?.name || '',
        e.resources?.name || '',
        `"${(e.content || '').replace(/"/g, '""')}"`,
        e.latitude || '',
        e.longitude || '',
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `libro-guardia-${dateFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <BookOpen size={24} className="text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Libro de Guardia</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[11px] font-black text-green-600 uppercase tracking-widest">Sincronización en vivo</span>
              </div>
            </div>
          </div>
          <p className="text-gray-500 text-sm font-medium mt-3">
            {filteredEntries.length} registros · actualizados en tiempo real
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <div className="relative flex-1 md:w-48 min-w-[140px]">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="date" 
              className="w-full bg-white border border-gray-100 rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => fetchEntries()} className="h-10 px-3 rounded-xl">
            <RefreshCw size={14} />
          </Button>
          <Button variant="outline" onClick={handleExport} className="h-10 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest gap-2">
            <Download size={14} /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white/50 backdrop-blur-sm p-2 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar por operador, objetivo o contenido..."
            className="w-full bg-transparent border-none py-3 pl-12 pr-4 text-sm focus:outline-none placeholder:text-gray-400 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Objective filter */}
        <div className="flex items-center gap-1 px-2">
          <Building2 size={14} className="text-gray-400 shrink-0" />
          <select
            value={filterObjective}
            onChange={(e) => setFilterObjective(e.target.value)}
            className="text-[11px] font-black uppercase bg-transparent border-none focus:outline-none text-gray-600 cursor-pointer"
          >
            <option value="all">Todos los objetivos</option>
            {objectives.map((o: any) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        <div className="flex p-1 bg-gray-50 rounded-xl gap-1 flex-wrap">
          {['all', 'fichaje', 'libro_guardia', 'incidente', 'emergencia'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                "px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                filterType === type ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              {type === 'all' ? 'Ver Todo' : type === 'libro_guardia' ? 'Guardia' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-gray-100 border-t-primary rounded-full animate-spin" />
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Sincronizando Archivos Históricos...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-20 text-center border border-gray-100 border-dashed">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen size={40} className="text-gray-200" />
            </div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Sin registros detectados</h3>
            <p className="text-gray-400 text-sm mt-2 max-w-xs mx-auto">No hay entradas para los filtros seleccionados o el sistema está en espera de actividad.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            <AnimatePresence>
              {filteredEntries.map((entry, i) => {
                const urgencyCfg = URGENCY_CONFIG[entry.urgency || 'normal'] || URGENCY_CONFIG.normal;
                const isNew = entry.id === newEntryFlash;
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    className={cn(
                      "group relative bg-white border transition-all duration-500 p-5 rounded-[1.5rem] flex flex-col lg:flex-row gap-5",
                      "hover:shadow-lg hover:shadow-gray-100",
                      isNew && "ring-2 ring-primary ring-offset-2 shadow-lg shadow-primary/10",
                      entry.urgency === 'critica' && "bg-red-50/30 border-red-200",
                      entry.urgency === 'alta' && "bg-orange-50/20 border-orange-100",
                      (!entry.urgency || entry.urgency === 'normal' || entry.urgency === 'baja' || entry.urgency === 'media') && "border-gray-100",
                    )}
                  >
                    {isNew && (
                      <div className="absolute -top-2 -right-2 bg-primary text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase animate-bounce shadow-lg">
                        Nuevo
                      </div>
                    )}

                    {/* Time column */}
                    <div className="hidden lg:flex flex-col items-center gap-1 w-14 pt-1 border-r border-gray-100 mr-2 shrink-0">
                      <span className="text-[11px] font-black text-gray-900 tabular-nums">
                        {new Date(entry.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-200 mt-1" />
                      <div className="w-0.5 flex-1 bg-gray-50 rounded-full" />
                    </div>

                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center border shrink-0",
                            urgencyCfg.bg
                          )}>
                            {getEntryIcon(entry.entry_type, entry.urgency)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={cn("text-[11px] font-black uppercase tracking-widest", urgencyCfg.color)}>
                                {entry.entry_type}
                              </p>
                              {entry.urgency && entry.urgency !== 'normal' && (
                                <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-black uppercase border", urgencyCfg.bg, urgencyCfg.color)}>
                                  {urgencyCfg.label}
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-gray-900 mt-0.5">
                              {entry.objectives?.name || 'Ubicación General'}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl group-hover:bg-primary/5 transition-colors">
                          <User size={12} className="text-gray-400" />
                          <span className="text-[11px] font-black uppercase tracking-tighter text-gray-600 truncate max-w-[140px]">
                            {entry.resources?.name || entry.resource_id}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 font-medium leading-relaxed bg-gray-50/70 p-4 rounded-2xl border border-gray-100/80">
                        {entry.content}
                      </p>

                      <div className="flex items-center gap-5 pt-1">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter lg:hidden">
                          {new Date(entry.created_at).toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                        </span>
                        {entry.latitude && (
                          <div className="flex items-center gap-1.5">
                            <MapPin size={11} className="text-green-400" />
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">
                              {Number(entry.latitude).toFixed(4)}, {Number(entry.longitude).toFixed(4)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Clock size={11} className="text-gray-400" />
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">Cloud 704</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
