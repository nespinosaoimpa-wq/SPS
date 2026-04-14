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
  ExternalLink
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
    { id: 'personal', label: 'Personal', icon: Users },
    { id: 'historial', label: 'Historial', icon: Clock },
    { id: 'libro', label: 'Libro de Guardia', icon: MessageSquare },
    { id: 'herramientas', label: 'Herramientas', icon: Hammer },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      
      {/* 1. HEADER */}
      <div className="flex flex-col gap-4">
        <Link href="/gerente" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors w-fit">
          <ArrowLeft size={16} /> Volver al Mapa
        </Link>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Shield size={28} className="text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">{objective.name}</h1>
                <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold rounded-full border border-green-100 uppercase">
                  {objective.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <MapPin size={14} className="text-gray-400" /> {objective.address}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" className="h-10 text-xs font-bold uppercase">
              <FileText size={14} className="mr-2" /> Contrato
            </Button>
            <Button variant="primary" className="h-10 text-xs font-bold uppercase">
              Editar Objetivo
            </Button>
          </div>
        </div>
      </div>

      {/* 2. TABS NAVIGATION */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex-1 lg:flex-none",
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-xl shadow-gray-200/50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
            )}
          >
            <tab.icon size={14} className={activeTab === tab.id ? "text-primary" : "text-gray-400"} />
            <span className="uppercase tracking-wide">{tab.label}</span>
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
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Información del Cliente</h3>
                  <div className="space-y-4">
                    <InfoItem icon={Building2} label="Cliente" value={objective.client_name || 'No especificado'} />
                    <InfoItem icon={MapPin} label="Ubicación" value={objective.address} />
                    <InfoItem icon={Phone} label="Contacto" value={objective.contact_phone || 'No registrado'} />
                    <InfoItem icon={Shield} label="Tipo de objetivo" value="Custodia Física" />
                  </div>
                </div>
                
                <div className="pt-6 border-t border-gray-100">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Métricas Rápidas</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Eficiencia</p>
                      <p className="text-lg font-black text-gray-900">98%</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Alertas</p>
                      <p className="text-lg font-black text-green-600">0</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Map Preview */}
              <Card className="lg:col-span-2 overflow-hidden h-[400px] lg:h-auto relative">
                <MapView 
                  objectives={[objective]} 
                  center={[objective.latitude, objective.longitude]}
                  zoom={16}
                  className="w-full h-full"
                  selectedObjectiveId={objective.id}
                />
                <div className="absolute top-4 right-4 z-10">
                  <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-gray-100 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-bold text-gray-700 uppercase">Vista Satelital Activa</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resources.length > 0 ? resources.map((res: any) => (
                  <Card key={res.id} className="p-5 hover:border-primary/30 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <User size={20} className="text-gray-400 group-hover:text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate uppercase">{res.name}</p>
                        <p className="text-xs text-gray-500">{res.role || 'Vigilador'}</p>
                      </div>
                      <Link href={`/gerente/personal/${res.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                          <ExternalLink size={14} />
                        </Button>
                      </Link>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="text-[10px] font-bold text-green-600 uppercase">En servicio</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">Fichó: 07:02</span>
                    </div>
                  </Card>
                )) : (
                  <div className="col-span-full py-20 text-center">
                    <Users size={40} className="text-gray-200 mx-auto mb-4" />
                    <p className="text-sm text-gray-400">No hay personal asignado actualmente</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'historial' && (
            <Card className="overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Últimos Turnos Registrados</h3>
                <Button variant="outline" size="sm" className="text-[10px] h-8 font-bold uppercase">Descargar Reporte</Button>
              </div>
              <div className="divide-y divide-gray-50">
                {shifts.length > 0 ? shifts.map((shift: any) => (
                  <div key={shift.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                        <User size={16} className="text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 uppercase">{shift.resources?.name || 'Recurso'}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                          <Calendar size={12} /> {new Date(shift.checkin_time).toLocaleDateString('es-AR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-8 items-center">
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-900">{new Date(shift.checkin_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-medium">Entrada</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-900">{shift.checkout_time ? new Date(shift.checkout_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-medium">Salida</p>
                      </div>
                      <div className="text-right w-16">
                        <p className="text-sm font-black text-primary">{shift.duration_hours?.toFixed(1) || '0.0'}h</p>
                        <p className="text-[10px] text-gray-400 uppercase font-medium">Total</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  </div>
                )) : (
                  <div className="py-20 text-center">
                    <Clock size={40} className="text-gray-200 mx-auto mb-4" />
                    <p className="text-sm text-gray-400">Sin historial de turnos reciente</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeTab === 'libro' && (
            <div className="space-y-4">
              <Card className="p-6 text-center py-20">
                <MessageSquare size={40} className="text-gray-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">Libro de Guardia Virtual</h3>
                <p className="text-sm text-gray-400 max-w-sm mx-auto">Próximamente podrás ver y buscar todas las novedades digitales reportadas por los guardias en este objetivo.</p>
                <div className="mt-8 flex justify-center gap-3">
                  <Button variant="primary" disabled className="h-10 text-xs font-bold uppercase">Habilitar Libro Digital</Button>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'herramientas' && (
            <div className="space-y-4">
              <Card className="p-6 text-center py-20">
                <Hammer size={40} className="text-gray-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">Control de Herramientas</h3>
                <p className="text-sm text-gray-400 max-w-sm mx-auto">Inventario de equipos asignados a este puesto (radios, linternas, llaves, armamento, etc.) con trazabilidad de entrega.</p>
                <div className="mt-8 flex justify-center gap-3">
                  <Button variant="primary" disabled className="h-10 text-xs font-bold uppercase">Gestionar Inventario</Button>
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
