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
  ShieldAlert
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

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
    const { data, error } = await supabase
      .from('geofencing_incidents')
      .select(`
        *,
        shift:guard_shifts(id, checkin_time),
        objective:objectives(name),
        operator:resources!operator_id(name)
      `)
      .order('exit_at', { ascending: false });

    if (!error) setIncidents(data || []);
    setLoading(false);
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
          className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-tactical z-[150] flex flex-col"
        >
          {/* Header */}
          <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-zinc-950 text-white">
            <div>
              <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
                <FileText className="text-primary" />
                Auditoría de Geocercas
              </h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Control de Abandono de Puesto</p>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
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
                    "p-5 cursor-pointer transition-all hover:shadow-lg border-l-4",
                    inc.status === 'pendiente' ? "border-l-red-500" : 
                    inc.status === 'justificado' ? "border-l-green-500" : "border-l-zinc-900"
                  )}
                  onClick={() => {
                    setSelectedIncident(inc);
                    setComment(inc.supervisor_comment || '');
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                        <User size={14} className="text-zinc-600" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase">{inc.operator?.name || 'Operador'}</p>
                        <p className="text-[10px] text-gray-400">{inc.objective?.name}</p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest",
                      inc.status === 'pendiente' ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"
                    )}>
                      {inc.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[10px] text-gray-500 font-medium">
                    <div className="flex items-center gap-2">
                      <Clock size={12} />
                      Salida: {new Date(inc.exit_at).toLocaleTimeString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={12} />
                      Desvío Máx: {Math.round(inc.max_distance_meters)}m
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Incident Detail Modal Overlay */}
          <AnimatePresence>
            {selectedIncident && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white z-[10] flex flex-col"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                    <ShieldAlert className="text-red-500" />
                    Detalle de Incidencia
                  </h3>
                  <button onClick={() => setSelectedIncident(null)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  {/* Map Snapshot */}
                  {selectedIncident.map_snapshot_url ? (
                    <div className="rounded-[2rem] overflow-hidden shadow-2xl border border-gray-100 relative group">
                      <img src={selectedIncident.map_snapshot_url} alt="Desvío" className="w-full h-48 object-cover" />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors flex items-center justify-center">
                        <MapIcon className="text-white drop-shadow-lg" size={32} />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-zinc-100 rounded-[2rem] flex flex-col items-center justify-center text-gray-400 gap-2 border border-dashed border-gray-200">
                      <MapIcon size={32} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Mapa no disponible</span>
                    </div>
                  )}

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Operador</p>
                      <p className="text-sm font-bold">{selectedIncident.operator?.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Objetivo</p>
                      <p className="text-sm font-bold">{selectedIncident.objective?.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Inicio Desvío</p>
                      <p className="text-sm font-bold">{new Date(selectedIncident.exit_at).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Retorno</p>
                      <p className="text-sm font-bold">{selectedIncident.return_at ? new Date(selectedIncident.return_at).toLocaleString() : 'En curso...'}</p>
                    </div>
                  </div>

                  {/* Validation Form */}
                  <div className="space-y-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <MessageSquare size={12} />
                      Validación de Supervisión
                    </p>
                    <textarea 
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-medium placeholder:text-gray-300 focus:ring-2 focus:ring-primary/20 min-h-[100px]"
                      placeholder="Ingrese comentarios sobre el incidente..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    
                    <div className="flex gap-3">
                      <Button 
                        className="flex-1 h-14 bg-green-500 hover:bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                        onClick={() => resolveIncident(selectedIncident.id, 'justificado')}
                      >
                        Justificar
                      </Button>
                      <Button 
                        className="flex-1 h-14 bg-zinc-900 hover:bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                        onClick={() => resolveIncident(selectedIncident.id, 'sancionado')}
                      >
                        Sancionar
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-center">
                   <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-gray-400 gap-2">
                     <Download size={14} />
                     Descargar Reporte PDF (Próximamente)
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
