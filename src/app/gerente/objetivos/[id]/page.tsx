'use client';

import React, { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  MapPin, 
  Users, 
  Clock, 
  Shield, 
  Calendar, 
  FileText, 
  Hammer, 
  MessageSquare,
  Building2,
  Phone,
  ChevronRight,
  User,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function ObjectiveDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [objective, setObjective] = useState<any>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  const [guardBook, setGuardBook] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch objective
        const { data: obj } = await supabase.from('objectives').select('*').eq('id', id).single();
        setObjective(obj);

        // Fetch recent shifts
        const { data: shiftData } = await supabase
          .from('guard_shifts')
          .select('*, resources(name, role)')
          .eq('objective_id', id)
          .order('checkin_time', { ascending: false })
          .limit(10);
        setShifts(shiftData || []);

        // Fetch assigned guards
        const { data: resData } = await supabase.from('resources').select('*').eq('current_objective_id', id);
        setResources(resData || []);

        // Fetch guard book entries
        const { data: bookData } = await supabase
          .from('guard_book_entries')
          .select('*')
          .eq('objective_id', id)
          .order('created_at', { ascending: false });
        setGuardBook(bookData || []);

      } catch (error) {
        console.error('Error fetching objective details:', error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  if (loading || !objective) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-primary rounded-full animate-spin" />
        <p className="mt-3 text-sm text-gray-400 font-medium italic">Sincronizando datos del objetivo...</p>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: MapPin },
    { id: 'personal', label: 'Personal Asignado', icon: Users },
    { id: 'libro', label: 'Libro de Guardia', icon: MessageSquare },
    { id: 'historial', label: 'Turnos', icon: Clock },
    { id: 'herramientas', label: 'Activos', icon: Hammer },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      
      {/* 1. HEADER */}
      <div className="flex flex-col gap-4">
        <Link href="/gerente/objetivos" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors w-fit">
          <ArrowLeft size={16} /> Volver a Objetivos
        </Link>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner">
               <MapPin size={28} className="text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase leading-tight">{objective.name}</h1>
                <span className={cn(
                  "px-2 py-0.5 text-[10px] font-black rounded-full border uppercase shadow-sm",
                  objective.status === 'Activo' ? "bg-green-50 text-green-600 border-green-100" : "bg-gray-100 text-gray-500 border-gray-200"
                )}>
                  {objective.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1.5 font-medium">
                <Building2 size={14} className="text-gray-400" /> {objective.client_name || 'Cliente Particular'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="outline" className="flex-1 sm:flex-none h-11 text-xs font-black uppercase tracking-wider bg-white">
              <FileText size={14} className="mr-2" /> Contrato
            </Button>
            <Button variant="primary" className="flex-1 sm:flex-none h-11 text-xs font-black uppercase tracking-wider shadow-lg shadow-primary/20">
              Configuración
            </Button>
          </div>
        </div>
      </div>

      {/* 2. TABS NAVIGATION */}
      <div className="flex gap-1 bg-gray-100/80 backdrop-blur-sm p-1.5 rounded-2xl overflow-x-auto no-scrollbar border border-gray-200/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center justify-center gap-2 px-6 py-3 text-[11px] font-black rounded-xl transition-all whitespace-nowrap flex-1 lg:flex-none uppercase tracking-wider",
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
            )}
          >
            <tab.icon size={14} className={activeTab === tab.id ? "text-primary" : "text-gray-400"} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 3. TAB CONTENT */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Info Card */}
              <Card className="lg:col-span-1 p-6 space-y-6">
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Detalle de Ubicación</h3>
                  <div className="space-y-4">
                    <InfoItem icon={MapPin} label="Dirección" value={objective.address} />
                    <InfoItem icon={Phone} label="Teléfono de Enlace" value={objective.contact_phone || 'No registrado'} />
                    <InfoItem icon={Shield} label="Nivel de Servicio" value="Protección 24/7" />
                    <InfoItem icon={Calendar} label="Inicio de Servicio" value="Abril 2026" />
                  </div>
                </div>
                
                <div className="pt-6 border-t border-gray-100">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Estado Operativo</h3>
                  <div className="p-4 bg-green-50/50 rounded-2xl border border-green-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-green-700">Nodo Activo</p>
                      <p className="text-[10px] text-green-600 font-medium">Sin incidentes reportados hoy</p>
                    </div>
                    <CheckCircle2 size={24} className="text-green-500" />
                  </div>
                </div>
              </Card>

              {/* Map Preview */}
              <Card className="lg:col-span-2 overflow-hidden h-[400px] lg:h-auto relative border-gray-200 shadow-xl shadow-gray-200/20">
                <MapView 
                  objectives={[objective]} 
                  center={[objective.latitude, objective.longitude]}
                  zoom={16}
                  className="w-full h-full"
                  selectedObjectiveId={objective.id}
                />
                <div className="absolute top-4 right-4 z-10">
                  <div className="bg-gray-900/90 backdrop-blur px-3 py-1.5 rounded-full border border-gray-800 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[9px] font-black text-white uppercase tracking-wider">Monitoreo Live</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-2">
                 <h3 className="text-sm font-black text-gray-900 uppercase">Dotación Asignada</h3>
                 <Link href="/gerente/personal">
                   <Button variant="outline" size="sm" className="text-[10px] h-9 font-bold uppercase">Asignar Personal</Button>
                 </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resources.length > 0 ? resources.map((res: any) => (
                  <Card key={res.id} className="p-5 hover:border-primary/30 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 -mr-8 -mt-8 rounded-full blur-xl group-hover:bg-primary/10 transition-colors" />
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <User size={20} className="text-gray-400 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate uppercase tracking-tight">{res.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{res.role || 'Vigilador'}</p>
                      </div>
                      <Link href={`/gerente/personal/${res.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                          <ExternalLink size={14} />
                        </Button>
                      </Link>
                    </div>
                    {res.contract_name && (
                      <div className="mt-4 p-2 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-2">
                        <FileText size={12} className="text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-500">{res.contract_name}</span>
                      </div>
                    )}
                  </Card>
                )) : (
                  <div className="col-span-full py-24 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                    <Users size={40} className="text-gray-200 mx-auto mb-4" />
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-tight">Sin personal fijo asignado</p>
                    <p className="text-xs text-gray-300 mt-1">Usa la gestión de personal para vincular empleados a este objetivo.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'libro' && (
            <Card className="overflow-hidden border-none shadow-xl shadow-gray-200/30">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                <div>
                   <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Registros de Guardia</h3>
                   <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Novedades, Rondas e Incidentes</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-[10px] h-9 font-bold uppercase">Exportar PDF</Button>
                </div>
              </div>
              <div className="divide-y divide-gray-50 bg-white">
                {guardBook.length > 0 ? guardBook.map((entry: any) => (
                  <div key={entry.id} className="px-6 py-5 flex items-start gap-4 hover:bg-gray-50/50 transition-colors group">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm",
                      entry.entry_type === 'incidente' ? "bg-red-50 text-red-600 border-red-100" : 
                      entry.entry_type === 'novedad' ? "bg-blue-50 text-blue-600 border-blue-100" :
                      "bg-gray-50 text-gray-500 border-gray-100"
                    )}>
                      {entry.entry_type === 'incidente' ? <AlertCircle size={18} /> : 
                       entry.entry_type === 'novedad' ? <MessageSquare size={18} /> :
                       <Clock size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className={cn(
                            "text-[10px] font-black uppercase tracking-widest mb-1",
                            entry.entry_type === 'incidente' ? "text-red-600" : "text-gray-400"
                          )}>
                            {entry.entry_type}
                          </p>
                          <p className="text-sm font-bold text-gray-800 leading-snug">{entry.content}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-gray-900">{new Date(entry.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                          <p className="text-[9px] text-gray-400 uppercase font-bold">{new Date(entry.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-24 text-center">
                    <MessageSquare size={48} className="text-gray-100 mx-auto mb-4" />
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-tight">El libro de guardia está vacío</p>
                    <p className="text-xs text-gray-300 mt-1">Los reportes enviados por el personal aparecerán aquí en tiempo real.</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeTab === 'historial' && (
            <Card className="overflow-hidden shadow-xl shadow-gray-200/30">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Control de Presentismo</h3>
                <Button variant="outline" size="sm" className="text-[10px] h-9 font-bold uppercase">Reporte Operativo</Button>
              </div>
              <div className="divide-y divide-gray-50 bg-white">
                {shifts.length > 0 ? shifts.map((shift: any) => (
                  <div key={shift.id} className="px-6 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
                        <User size={16} className="text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900 uppercase tracking-tighter">{shift.resources?.name || 'Recurso'}</p>
                        <p className="text-[10px] text-gray-500 flex items-center gap-1.5 font-bold uppercase">
                          <Calendar size={12} /> {new Date(shift.checkin_time).toLocaleDateString('es-AR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-10 items-center">
                      <div className="text-right">
                        <p className="text-xs font-black text-gray-900">{new Date(shift.checkin_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-black">ENTRADA</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-gray-900">{shift.checkout_time ? new Date(shift.checkout_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-black">SALIDA</p>
                      </div>
                      <div className="text-right w-16 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-xs font-black text-primary">{shift.duration_hours?.toFixed(1) || '--'}h</p>
                        <p className="text-[9px] text-gray-400 uppercase font-black">CUMPLIDO</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  </div>
                )) : (
                  <div className="py-24 text-center">
                    <Clock size={48} className="text-gray-100 mx-auto mb-4" />
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-tight">Sin registros de turnos</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeTab === 'herramientas' && (
            <div className="space-y-4">
              <Card className="p-6 text-center py-24 bg-gray-50/30 border border-gray-100 rounded-2xl shadow-inner">
                <Hammer size={48} className="text-gray-200 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-black text-gray-900 mb-2 uppercase tracking-tight">Activos del Puesto</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto font-medium leading-relaxed">Control de inventario de equipos asignados a este puesto (radios, linternas, herramientas de comunicación).</p>
                <div className="mt-8 flex justify-center gap-3">
                  <Button variant="outline" disabled className="h-10 text-[10px] font-black uppercase tracking-wider bg-white">Próximo Módulo</Button>
                </div>
              </Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-xl">
      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 border border-gray-100 shadow-sm">
        <Icon size={16} className="text-primary" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}
