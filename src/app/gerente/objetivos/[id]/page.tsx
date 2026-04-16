'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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

export default function ObjectiveDetail() {
  const routeParams = useParams();
  const id = routeParams?.id as string | undefined;
  const [mounted, setMounted] = useState(false);
  const [objective, setObjective] = useState<any>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [guardBook, setGuardBook] = useState<any[]>([]);

  // 1. Hydration guard
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. Fetch data when ID is ready
  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch objective
        const { data: obj, error: objError } = await supabase
          .from('objectives')
          .select('*')
          .eq('id', id)
          .single();
        
        if (objError || !obj) throw new Error("No se pudo encontrar el objetivo solicitado.");
        setObjective(obj);

        // Fetch recent shifts
        const { data: shiftData } = await supabase
          .from('guard_shifts')
          .select('*, resources(name, role)')
          .eq('objective_id', id)
          .order('check_in', { ascending: false })
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

      } catch (err: any) {
        console.error('Fetch error:', err);
        setError(err.message || "Error de comunicación con la base de datos.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Prevent SSR crashes
  if (!mounted) return null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-gray-100 border-t-primary rounded-full animate-spin" />
        <p className="mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">Sincronizando Nodo...</p>
      </div>
    );
  }

  if (error || !objective) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center max-w-sm mx-auto">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4 border border-red-100">
           <AlertCircle size={32} className="text-red-500" />
        </div>
        <h2 className="text-xl font-black text-gray-900 uppercase">Nodo no disponible</h2>
        <p className="mt-2 text-sm text-gray-500 font-medium">{error || "El objetivo no existe."}</p>
        <Link href="/gerente" className="mt-8">
          <Button variant="primary" className="h-11 px-8 text-[10px] font-black uppercase tracking-wider">Volver al Dashboard</Button>
        </Link>
      </div>
    );
  }

  const mapCenter: [number, number] = [
    typeof objective.latitude === 'number' ? objective.latitude : -31.6107,
    typeof objective.longitude === 'number' ? objective.longitude : -60.6973
  ];

  const tabs = [
    { id: 'general', label: 'General', icon: MapPin },
    { id: 'personal', label: 'Personal', icon: Users },
    { id: 'libro', label: 'Libro', icon: MessageSquare },
    { id: 'historial', label: 'Turnos', icon: Clock },
    { id: 'herramientas', label: 'Activos', icon: Hammer },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      
      {/* 1. HEADER */}
      <div className="flex flex-col gap-5">
        <Link href="/gerente/objetivos" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-900 transition-colors w-fit font-bold">
          <ArrowLeft size={16} /> Volver a Objetivos
        </Link>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
               <MapPin size={32} className="text-black" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase leading-none">{objective.name}</h1>
                <span className={cn(
                  "px-3 py-1 text-[10px] font-black rounded-full border uppercase shadow-sm",
                  objective.status === 'Activo' ? "bg-green-50 text-green-600 border-green-100" : "bg-gray-100 text-gray-500 border-gray-200"
                )}>
                  {objective.status}
                </span>
              </div>
              <p className="text-sm font-bold text-gray-400 flex items-center gap-2 uppercase tracking-wide">
                <Building2 size={14} /> {objective.client_name || 'Particular'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="outline" className="flex-1 sm:flex-none h-12 text-[10px] font-black uppercase tracking-widest bg-white">
              <FileText size={16} className="mr-2" /> Contrato
            </Button>
            <Button variant="primary" className="flex-1 sm:flex-none h-12 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/30">
              Operaciones
            </Button>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION */}
      <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl overflow-x-auto no-scrollbar border border-gray-200/50 max-w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2.5 px-6 py-3.5 text-[11px] font-black rounded-xl transition-all whitespace-nowrap uppercase tracking-widest",
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-md ring-1 ring-gray-900/5"
                : "text-gray-400 hover:text-gray-600 hover:bg-white/50"
            )}
          >
            <tab.icon size={14} className={activeTab === tab.id ? "text-primary" : "text-gray-400"} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 3. CONTENT AREA (Simplified without Framer Motion for stability) */}
      <div className="min-h-[400px]">
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-1 p-8 space-y-8 border-none shadow-xl shadow-gray-200/30">
                <div>
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Especificaciones</h3>
                  <div className="space-y-4">
                    <InfoItem icon={MapPin} label="Dirección" value={objective.address} />
                    <InfoItem icon={Phone} label="Contacto" value={objective.contact_phone || 'N/A'} />
                    <InfoItem icon={Shield} label="Protocolo" value="ESTÁNDAR" />
                    <InfoItem icon={Calendar} label="Vigencia" value="ACTIVO" />
                  </div>
                </div>
                
                <div className="pt-8 border-t border-gray-100">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Estado</h3>
                  <div className="p-5 bg-green-50 rounded-2xl border border-green-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-green-700 uppercase">Nodo Online</p>
                      <p className="text-[10px] text-green-600 font-bold uppercase mt-1">Operativo OK</p>
                    </div>
                    <CheckCircle2 size={24} className="text-green-500" />
                  </div>
                </div>
              </Card>

              <Card className="lg:col-span-2 overflow-hidden min-h-[400px] relative border-none shadow-2xl shadow-gray-200/40 rounded-3xl">
                <MapView 
                  objectives={[objective]} 
                  center={mapCenter}
                  zoom={16}
                  className="w-full h-full"
                  selectedObjectiveId={objective.id}
                />
                <div className="absolute top-6 right-6 z-10">
                  <div className="bg-gray-900/90 backdrop-blur px-4 py-2 rounded-full border border-gray-700 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Live Feed</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resources.length > 0 ? resources.map((res: any) => (
                  <Card key={res.id} className="p-6 hover:shadow-xl transition-all border-none bg-white shadow-lg shadow-gray-100/50 group">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <User size={24} className="text-gray-400 group-hover:text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{res.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{res.role || 'Vigilador'}</p>
                      </div>
                      <Link href={`/gerente/personal/${res.id}`}>
                        <Button variant="ghost" size="icon" className="group-hover:text-primary"><ExternalLink size={16} /></Button>
                      </Link>
                    </div>
                  </Card>
                )) : (
                  <div className="col-span-full py-24 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                    <Users size={48} className="text-gray-200 mx-auto mb-4" />
                    <p className="text-sm font-black text-gray-400 uppercase tracking-widest italic">Sin personal fijo asignado</p>
                  </div>
                )}
            </div>
          )}

          {activeTab === 'libro' && (
            <Card className="overflow-hidden border-none shadow-2xl shadow-gray-200/30 rounded-3xl bg-white">
              <div className="divide-y divide-gray-50">
                {guardBook.length > 0 ? guardBook.map((entry: any) => (
                  <div key={entry.id} className="px-8 py-6 flex items-start gap-6 hover:bg-gray-50/30 transition-colors">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                      entry.entry_type === 'incidente' ? "bg-red-600 text-white" : "bg-blue-600 text-white"
                    )}>
                      {entry.entry_type === 'incidente' ? <AlertCircle size={20} /> : <MessageSquare size={20} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-[0.2em]",
                          entry.entry_type === 'incidente' ? "text-red-600" : "text-blue-600"
                        )}>{entry.entry_type}</span>
                        <span className="text-[10px] font-black text-gray-400">{new Date(entry.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-base font-bold text-gray-800 italic leading-relaxed">"{entry.content}"</p>
                    </div>
                  </div>
                )) : (
                  <div className="py-24 text-center">
                    <MessageSquare size={48} className="text-gray-100 mx-auto mb-4" />
                    <p className="text-sm font-black text-gray-400 uppercase tracking-widest italic">Diario de guardia vacío</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeTab === 'historial' && (
            <Card className="overflow-hidden border-none shadow-2xl shadow-gray-200/30 rounded-3xl bg-white">
               <div className="divide-y divide-gray-50">
                {shifts.length > 0 ? shifts.map((shift: any) => (
                  <div key={shift.id} className="px-8 py-6 flex items-center justify-between hover:bg-gray-50/30 transition-colors">
                     <div className="flex items-center gap-5">
                       <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                          <User size={20} className="text-gray-400" />
                       </div>
                       <div>
                         <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{shift.resources?.name || 'Recurso'}</p>
                         <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                           {shift.check_in ? new Date(shift.check_in).toLocaleDateString() : 'N/A'}
                         </p>
                       </div>
                     </div>
                     <div className="flex gap-12 text-right">
                        <div>
                           <p className="text-sm font-black text-gray-900">
                             {shift.check_in ? new Date(shift.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                           </p>
                           <p className="text-[9px] font-black text-gray-400 uppercase mt-0.5">Entrada</p>
                        </div>
                        <div>
                           <p className="text-sm font-black text-gray-900">
                             {shift.check_out ? new Date(shift.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                           </p>
                           <p className="text-[9px] font-black text-gray-400 uppercase mt-0.5">Salida</p>
                        </div>
                     </div>
                  </div>
                )) : (
                  <div className="py-24 text-center text-gray-400 italic text-sm font-bold uppercase">Sin registros de turnos</div>
                )}
               </div>
            </Card>
          )}

          {activeTab === 'herramientas' && (
            <Card className="p-16 text-center bg-gray-50 border-none rounded-3xl shadow-inner">
               <Hammer size={56} className="text-gray-200 mx-auto mb-6" />
               <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Gestión de Activos</h3>
               <p className="text-sm text-gray-400 mt-2 font-medium max-w-md mx-auto">Control de inventario para dispositivos de comunicación, armamento y herramientas asignadas a este nodo.</p>
            </Card>
          )}
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-center gap-4 py-1.5 px-1 hover:translate-x-1 transition-transform cursor-default group">
      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 border border-gray-100 shadow-sm group-hover:border-primary/50 group-hover:shadow-primary/10 transition-all">
        <Icon size={16} className="text-primary" />
      </div>
      <div className="flex-1 border-b border-gray-50 pb-1.5 group-hover:border-primary/20 transition-colors">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-gray-900 mt-0.5 tracking-tight uppercase">{value || 'No definido'}</p>
      </div>
    </div>
  );
}
