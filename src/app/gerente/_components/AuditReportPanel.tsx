'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Map as MapIcon, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle,
  Download,
  X,
  MessageSquare,
  ShieldAlert,
  History
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function AuditReportPanel({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (isOpen) fetchIncidents();
  }, [isOpen]);

  async function fetchIncidents() {
    setLoading(true);
    try {
      // 1. Fetch plain geofencing_incidents without fragile joins
      const { data: rawIncidents } = await supabase
        .from('geofencing_incidents')
        .select('*')
        .order('exit_at', { ascending: false });

      // 2. Fetch abandon alerts from guard_book_entries as supplementary audit records
      const { data: abandonAlerts } = await supabase
        .from('guard_book_entries')
        .select('*')
        .or('entry_type.eq.alerta,content.ilike.%abandon%')
        .order('created_at', { ascending: false });

      const allRaw = rawIncidents || [];

      // Collect IDs for manual enrichment of operators and objectives
      const opIds = Array.from(new Set([
        ...allRaw.map((i: any) => i.operator_id),
        ...(abandonAlerts || []).map((a: any) => a.operator_id || a.resource_id)
      ].filter(Boolean)));

      const objIds = Array.from(new Set([
        ...allRaw.map((i: any) => i.objective_id),
        ...(abandonAlerts || []).map((a: any) => a.objective_id)
      ].filter(Boolean)));

      const [{ data: resources }, { data: objectives }] = await Promise.all([
        opIds.length > 0 ? supabase.from('resources').select('id, name').in('id', opIds) : { data: [] },
        objIds.length > 0 ? supabase.from('objectives').select('id, name').in('id', objIds) : { data: [] }
      ]);

      const resMap: Record<string, string> = {};
      (resources || []).forEach((r: any) => { resMap[r.id] = r.name; });

      const objMap: Record<string, string> = {};
      (objectives || []).forEach((o: any) => { objMap[o.id] = o.name; });

      // Map geofencing_incidents
      const enrichedGeo = allRaw.map((inc: any) => ({
        id: inc.id,
        exit_at: inc.exit_at || inc.created_at,
        created_at: inc.exit_at || inc.created_at,
        max_distance_meters: inc.max_distance_meters || 0,
        status: inc.status || 'pendiente',
        supervisor_comment: inc.supervisor_comment,
        operator: { name: resMap[inc.operator_id] || 'Operador' },
        objective: { name: objMap[inc.objective_id] || 'Puesto de Servicio' },
        source: 'geofence'
      }));

      // Map abandon alerts from guard_book_entries that aren't duplicate
      const enrichedBook = (abandonAlerts || []).map((a: any) => {
        const opId = a.operator_id || a.resource_id;
        const distMatch = (a.content || '').match(/(\d+)m/);
        const dist = distMatch ? parseInt(distMatch[1]) : 0;
        return {
          id: a.id,
          exit_at: a.created_at,
          created_at: a.created_at,
          max_distance_meters: dist,
          status: a.status || 'pendiente',
          supervisor_comment: a.notes || null,
          operator: { name: resMap[opId] || 'Operador' },
          objective: { name: objMap[a.objective_id] || 'Puesto de Servicio' },
          source: 'guard_book',
          content: a.content
        };
      });

      // Combine both lists and deduplicate
      const combined = [...enrichedGeo];
      enrichedBook.forEach(bookItem => {
        const exists = combined.some(geoItem => 
          Math.abs(new Date(geoItem.exit_at).getTime() - new Date(bookItem.exit_at).getTime()) < 30000
        );
        if (!exists) {
          combined.push(bookItem);
        }
      });

      combined.sort((a, b) => new Date(b.exit_at).getTime() - new Date(a.exit_at).getTime());

      setIncidents(combined);
    } catch (e) {
      console.error('[AuditReportPanel] Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function resolveIncident(id: string, status: 'justificado' | 'sancionado') {
    try {
      const res = await fetch(`/api/tracking/incidents/${id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comment })
      });
      if (res.ok) {
        setComment('');
        setSelectedIncident(null);
        fetchIncidents();
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-y-0 right-0 w-full max-w-2xl bg-zinc-950/80 backdrop-blur-2xl border-l border-white/10 shadow-tactical z-[150] flex flex-col"
        >
          {/* Header */}
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/40 text-white">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                <FileText className="text-primary" />
                Auditoría de Geocercas
              </h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Control de Abandono de Puesto</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/gerente/trazabilidad" onClick={onClose}>
                <Button variant="ghost" className="h-10 px-4 bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-white/10 gap-2">
                  <History size={14} />
                  Trazabilidad
                </Button>
              </Link>
              <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-black">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400 uppercase text-[10px] font-black tracking-widest animate-pulse">
                Analizando telemetría...
              </div>
            ) : incidents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                <CheckCircle2 size={48} className="opacity-20" />
                <p className="uppercase text-[10px] font-black tracking-widest">Sin incidencias registradas</p>
              </div>
            ) : (
              incidents.map((inc) => (
                <Card 
                  key={inc.id} 
                  className={cn(
                    "p-5 cursor-pointer transition-all hover:shadow-xl border-white/5 bg-white/5 backdrop-blur-md border-l-4",
                    inc.status === 'pendiente' ? "border-l-red-500" : 
                    inc.status === 'justificado' ? "border-l-green-500" : "border-l-zinc-700"
                  )}
                  onClick={() => {
                    setSelectedIncident(inc);
                    setComment(inc.supervisor_comment || '');
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                        <User size={14} className="text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase text-white">{inc.operator?.name || 'Operador'}</p>
                        <p className="text-[10px] text-zinc-500">{inc.objective?.name}</p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest font-mono",
                      inc.status === 'pendiente' ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                    )}>
                      {inc.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[10px] text-gray-400 font-medium">
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-primary" />
                      Fecha: {new Date(inc.exit_at).toLocaleDateString('es-AR')} {new Date(inc.exit_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={12} className="text-red-400" />
                      Desvío Máx: <strong className="text-white font-mono">{inc.max_distance_meters > 0 ? `${inc.max_distance_meters}m` : 'Registrado'}</strong>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Incident Detail Drawer / Modal Overlay */}
          <AnimatePresence>
            {selectedIncident && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="p-6 bg-zinc-900 border-t border-white/10 space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                    <AlertCircle className="text-red-500" size={16} />
                    Dictamen de Incidente
                  </h3>
                  <button onClick={() => setSelectedIncident(null)} className="text-gray-400 hover:text-white">
                    <X size={16} />
                  </button>
                </div>

                <p className="text-xs text-zinc-300">
                  Operador <strong className="text-white">{selectedIncident.operator?.name}</strong> se alejó {selectedIncident.max_distance_meters}m del objetivo <strong className="text-white">{selectedIncident.objective?.name}</strong>.
                </p>

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ingrese descargo del supervisor u observaciones..."
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                  rows={2}
                />

                <div className="flex gap-3">
                  <Button 
                    onClick={() => resolveIncident(selectedIncident.id, 'justificado')}
                    className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 text-[10px] font-black uppercase tracking-widest h-10"
                  >
                    Justificar Abandono
                  </Button>
                  <Button 
                    onClick={() => resolveIncident(selectedIncident.id, 'sancionado')}
                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-[10px] font-black uppercase tracking-widest h-10"
                  >
                    Aplicar Sanción
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
