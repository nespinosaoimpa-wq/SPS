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
  FileText
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export default function GuardBookPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchEntries();
    
    // Real-time subscription for live updates
    const channel = supabase
      .channel('public:guard_book_entries')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guard_book_entries' }, (payload) => {
        setEntries(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dateFilter]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('guard_book_entries')
        .select(`
          *,
          resources (name),
          objectives (name)
        `)
        .order('created_at', { ascending: false });

      if (dateFilter) {
        const start = `${dateFilter}T00:00:00Z`;
        const end = `${dateFilter}T23:59:59Z`;
        query = query.gte('created_at', start).lte('created_at', end);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEntries(data || []);
    } catch (err: any) {
      console.error('Error fetching guard book:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(e => {
    const matchesSearch = 
      (e.content?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (e.resources?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (e.objectives?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || e.entry_type === filterType;
    
    return matchesSearch && matchesType;
  });

  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'incidente': return <AlertTriangle className="text-red-500" size={18} />;
      case 'fichaje': return <CheckCircle2 className="text-green-500" size={18} />;
      case 'novedad': return <FileText className="text-blue-500" size={18} />;
      case 'ronda': return <ShieldCheck className="text-amber-500" size={18} />;
      default: return <Clock className="text-gray-400" size={18} />;
    }
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
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Libro de Guardia</h1>
          </div>
          <p className="text-gray-500 text-sm font-medium mt-2">Seguimiento cronológico de operaciones y registro histórico.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="date" 
              className="w-full bg-white border border-gray-100 rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm uppercase tracking-tighter"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2">
            <Download size={14} /> Exportar
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white/50 backdrop-blur-sm p-2 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar por operador, objetivo o contenido..."
            className="w-full bg-transparent border-none py-3 pl-12 pr-4 text-sm focus:outline-none placeholder:text-gray-300 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex p-1 bg-gray-50 rounded-xl gap-1">
          {['all', 'fichaje', 'novedad', 'incidente'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                filterType === type ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              {type === 'all' ? 'Ver Todo' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-gray-100 border-t-primary rounded-full animate-spin" />
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Sincronizando Archivos Históricos...</p>
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
          <div className="grid grid-cols-1 gap-1">
            {filteredEntries.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "group relative bg-white border border-transparent hover:border-gray-200 transition-all duration-300 p-6 rounded-[2rem] flex flex-col lg:flex-row gap-6 hover:shadow-xl hover:shadow-gray-200/50",
                  entry.entry_type === 'incidente' && "bg-red-50/20 border-red-100/50"
                )}
              >
                {/* Timeline Indicator */}
                <div className="hidden lg:flex flex-col items-center gap-1 w-12 pt-1 border-r border-gray-100 mr-2">
                  <span className="text-[11px] font-black text-gray-900">{new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                  <div className="w-0.5 flex-1 bg-gray-50 rounded-full" />
                </div>

                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        entry.entry_type === 'incidente' ? "bg-red-100" : "bg-gray-50"
                      )}>
                        {getEntryIcon(entry.entry_type)}
                      </div>
                      <div>
                        <p className={cn(
                          "text-[10px] font-black uppercase tracking-widest",
                          entry.entry_type === 'incidente' ? "text-red-500" : "text-primary"
                        )}>
                          {entry.entry_type}
                        </p>
                        <h4 className="text-sm font-bold text-gray-900 lowercase first-letter:uppercase">Reportado en {entry.objectives?.name || 'Ubicación General'}</h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl group-hover:bg-primary group-hover:text-black transition-colors duration-500">
                      <User size={14} className="text-gray-400 group-hover:text-black" />
                      <span className="text-[10px] font-black uppercase tracking-tighter truncate max-w-[120px]">
                        {entry.resources?.name}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 font-medium leading-relaxed bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                    {entry.content}
                  </p>

                  <div className="flex items-center gap-6 pt-2">
                    {entry.latitude && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-gray-300" />
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Verified Position</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-gray-300" />
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Sync: Cloud 704</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center justify-center">
                  <button className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 hover:bg-primary/20 hover:text-primary transition-all">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
