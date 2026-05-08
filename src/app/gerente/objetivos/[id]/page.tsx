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
  AlertCircle,
  X,
  ChevronRight,
  RotateCw,
  Scan,
  Map as MapIcon,
  Loader2,
  Plus,
  Search,
  Trash2
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { geocodeForward } from '@/lib/geocoding';

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
  
  // Guard Book state
  const [newEntryContent, setNewEntryContent] = useState('');
  const [newEntryType, setNewEntryType] = useState('novedad');
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);
  
  // Assignment state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [selectedResForMsg, setSelectedResForMsg] = useState<any>(null);
  const [quickMessage, setQuickMessage] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [assignStartTime, setAssignStartTime] = useState('');
  const [assignEndTime, setAssignEndTime] = useState('');
  const [programmedShifts, setProgrammedShifts] = useState<any[]>([]);

  // Checkpoints & Rounds
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [patrolRounds, setPatrolRounds] = useState<any[]>([]);
  const [newCheckpoint, setNewCheckpoint] = useState({ name: '', description: '', order_index: 0 });
  const [isAddingCheckpoint, setIsAddingCheckpoint] = useState(false);
  const [selectedRound, setSelectedRound] = useState<any>(null);
  const [isRoundMapOpen, setIsRoundMapOpen] = useState(false);
  const [roundPath, setRoundPath] = useState<any[]>([]);

  // 1. Hydration guard
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. Fetch data when ID is ready
  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        // Fetch objective via API (bypasses RLS)
        const objList = await api.objectives.list();
        const obj = objList.find((o: any) => o.id === id);
        if (!obj) throw new Error("No se pudo encontrar el objetivo solicitado.");
        setObjective(obj);

        // Fetch recent shifts
        const { data: shiftData } = await supabase
          .from('guard_shifts')
          .select('*')
          .eq('objective_id', id)
          .order('checkin_time', { ascending: false })
          .limit(20);
        setShifts(shiftData || []);

        // Fetch assigned guards via API
        const allRes = await api.staff.list();
        setResources((allRes || []).filter((r: any) => r.current_objective_id === id && r.status !== 'baja'));

        // Fetch guard book entries via secure API route
        const bookData = await api.guardBook.list({ objective_id: id, limit: 100 });
        setGuardBook(Array.isArray(bookData) ? bookData : []);

        // Fetch checkpoints
        const { data: cpData } = await supabase
          .from('checkpoints')
          .select('*')
          .eq('objective_id', id)
          .order('order_index', { ascending: true });
        setCheckpoints(cpData || []);

        // Fetch rounds
        const { data: roundData } = await supabase
          .from('patrol_rounds')
          .select('*')
          .eq('objective_id', id)
          .order('round_start', { ascending: false })
          .limit(20);
        setPatrolRounds(roundData || []);

        // Fetch programmed shifts (relevos)
        const { data: progShifts } = await supabase
          .from('guard_shifts')
          .select('*, resources:operator_id(name, role)')
          .eq('objective_id', id)
          .eq('status', 'programado')
          .order('checkin_time', { ascending: true });
        setProgrammedShifts(progShifts || []);

      } catch (err: any) {
        console.error('Fetch error:', err);
        setError(err.message || "Error de comunicación con la base de datos.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // REAL-TIME: Suscribirse a novedades y cambios en personal
    const bookChannel = supabase
      .channel(`objective-${id}-book`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'guard_book_entries', filter: `objective_id=eq.${id}` },
        (payload) => {
          setGuardBook(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    const resourceChannel = supabase
      .channel(`objective-${id}-resources`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'resources', filter: `current_objective_id=eq.${id}` },
        (payload) => {
          setResources(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookChannel);
      supabase.removeChannel(resourceChannel);
    };
  }, [id]);

  const fetchAllStaff = async () => {
    try {
      const data = await api.staff.list();
      setAllStaff((data || []).filter((r: any) => r.status !== 'baja'));
    } catch (err) {
      console.error("Error fetching staff:", err);
    }
  };

  const handleAssign = async (staffId: string) => {
    setIsAssigning(true);
    try {
      if (assignStartTime && assignEndTime) {
        // Create programmed shift
        const startIso = new Date(`${new Date().toISOString().split('T')[0]}T${assignStartTime}`).toISOString();
        const endIso = new Date(`${new Date().toISOString().split('T')[0]}T${assignEndTime}`).toISOString();
        
        await api.shifts.program({
          operator_id: staffId,
          objective_id: id,
          start_time: startIso,
          end_time: endIso,
          notes: `Turno programado por gerencia para hoy ${assignStartTime} - ${assignEndTime}`
        });

        // Send detailed notification
        try {
          await api.notifications.create({
            resource_id: staffId,
            type: 'assignment',
            title: 'Turno Programado Asignado',
            body: `Tenés un nuevo turno programado para hoy en "${objective?.name || 'Nuevo Objetivo'}" de ${assignStartTime} a ${assignEndTime} HS.`,
            data: { objective_id: id, start_time: assignStartTime, end_time: assignEndTime },
          });
        } catch (e) {}

      } else {
        // Legacy permanent assignment
        await api.staff.update(staffId, { current_objective_id: id });
        
        // Send notification to the operator about their new assignment
        try {
          await api.notifications.create({
            resource_id: staffId,
            type: 'assignment',
            title: 'Nueva Asignación de Objetivo',
            body: `Has sido asignado al objetivo "${objective?.name || 'Nuevo Objetivo'}". Dirección: ${objective?.address || 'Sin dirección registrada'}.`,
            data: { objective_id: id, objective_name: objective?.name, objective_address: objective?.address },
          });
        } catch (notifErr) {
          console.warn('Notification send failed (non-blocking):', notifErr);
        }
      }

      const allRes = await api.staff.list();
      setResources((allRes || []).filter((r: any) => r.current_objective_id === id && r.status !== 'baja'));
      
      // Refresh programmed shifts
      const { data: progShifts } = await supabase
        .from('guard_shifts')
        .select('*, resources:operator_id(name, role)')
        .eq('objective_id', id)
        .eq('status', 'programado')
        .order('checkin_time', { ascending: true });
      setProgrammedShifts(progShifts || []);

      setIsAssignModalOpen(false);
      setAssignStartTime('');
      setAssignEndTime('');
    } catch (err: any) {
      alert("Error al asignar: " + err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async (staffId: string) => {
    if (!confirm("¿Deseas desvincular a este guardia de este objetivo?")) return;
    try {
      await api.staff.update(staffId, { current_objective_id: null });
      setResources(prev => prev.filter(r => r.id !== staffId));
    } catch (err: any) {
      alert("Error al desvincular: " + err.message);
    }
  };

  const handleGeocode = async () => {
    if (!objective?.address) return;
    setIsUpdating(true);
    try {
      const results = await geocodeForward(objective.address);
      if (results.length === 0) {
        alert("No se pudo encontrar la ubicación para esta dirección.");
        return;
      }
      
      const { lat, lng } = results[0];
      const { error } = await supabase
        .from('objectives')
        .update({ latitude: lat, longitude: lng })
        .eq('id', id);
      
      if (error) throw error;
      
      setObjective({ ...objective, latitude: lat, longitude: lng });
      alert("¡Ubicación actualizada con éxito!");
    } catch (err: any) {
      alert("Error al geolocalizar: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddBookEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntryContent.trim()) return;

    setIsSubmittingEntry(true);
    try {
      // Manager entries use a fixed marker; resource_id will be the first assigned guard or a placeholder
      const assignedGuardId = resources[0]?.id;
      if (!assignedGuardId) {
        alert('Asigná al menos un guardia al objetivo antes de registrar novedades desde el panel.');
        return;
      }
      await api.guardBook.create({
        objective_id: id,
        resource_id: assignedGuardId,
        entry_type: newEntryType,
        content: `[GERENTE] ${newEntryContent}`,
        urgency: newEntryType === 'incidente' ? 'alta' : 'normal',
      });
      setNewEntryContent('');
      // Refresh list
      const bookData = await api.guardBook.list({ objective_id: id, limit: 100 });
      setGuardBook(Array.isArray(bookData) ? bookData : []);
    } catch (err: any) {
      alert("Error al guardar novedad: " + err.message);
    } finally {
      setIsSubmittingEntry(false);
    }
  };

  const handleAddCheckpoint = async () => {
    if (!newCheckpoint.name || !id) return;
    try {
      const { error } = await supabase
        .from('checkpoints')
        .insert({
          objective_id: id,
          name: newCheckpoint.name,
          description: newCheckpoint.description,
          order_index: checkpoints.length
        });
      
      if (error) throw error;
      
      setNewCheckpoint({ name: '', description: '', order_index: 0 });
      setIsAddingCheckpoint(false);
      
      // Refresh
      const { data } = await supabase
        .from('checkpoints')
        .select('*')
        .eq('objective_id', id)
        .order('order_index', { ascending: true });
      setCheckpoints(data || []);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleDeleteCheckpoint = async (cpId: string) => {
    if (!confirm("¿Eliminar este punto de control?")) return;
    try {
      const { error } = await supabase.from('checkpoints').delete().eq('id', cpId);
      if (error) throw error;
      setCheckpoints(prev => prev.filter(c => c.id !== cpId));
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleSendQuickMessage = async () => {
    if (!selectedResForMsg || !quickMessage.trim()) return;
    setIsSendingMsg(true);
    try {
      await api.notifications.create({
        resource_id: selectedResForMsg.id,
        title: 'Mensaje de Gerencia',
        content: quickMessage,
        type: 'mensaje',
        priority: 'alta'
      });
      setQuickMessage('');
      setIsMessageModalOpen(false);
      setSelectedResForMsg(null);
      alert('Mensaje enviado con éxito.');
    } catch (err: any) {
      alert('Error al enviar mensaje: ' + err.message);
    } finally {
      setIsSendingMsg(false);
    }
  };

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
    { id: 'rondines', label: 'Rondines', icon: RotateCw },
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
                    <div className="relative group/geo">
                      <InfoItem icon={MapPin} label="Dirección" value={objective.address} />
                      <Button 
                        onClick={handleGeocode}
                        disabled={isUpdating}
                        variant="ghost" 
                        size="sm" 
                        className="absolute right-0 top-1/2 -translate-y-1/2 h-8 text-[9px] font-black uppercase tracking-widest bg-primary/10 hover:bg-primary text-gray-900 border-none shadow-none"
                      >
                        {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <MapIcon size={12} className="mr-1" />}
                        Geolocalizar
                      </Button>
                    </div>
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
                  guards={resources}
                  incidents={guardBook}
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
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Personal Permanente</h3>
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="h-10 text-[10px] font-black uppercase tracking-wider"
                  onClick={() => {
                    fetchAllStaff();
                    setIsAssignModalOpen(true);
                  }}
                >
                  <Plus size={14} className="mr-2" /> Asignar Guardia
                </Button>
              </div>

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
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-primary hover:bg-primary/5"
                            onClick={() => {
                              setSelectedResForMsg(res);
                              setIsMessageModalOpen(true);
                            }}
                          >
                            <MessageSquare size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleUnassign(res.id)}
                          >
                            <X size={14} />
                          </Button>
                          <Link href={`/gerente/personal/${res.id}`}>
                            <Button variant="ghost" size="icon" className="hover:text-primary"><ExternalLink size={16} /></Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  )) : (
                    <div className="col-span-full py-12 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest italic">
                      Sin personal asignado permanentemente
                    </div>
                  )}
              </div>

              {/* Programmed Reliefs (Relevos) */}
              <div className="pt-8 border-t border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-500">
                      <Clock size={16} />
                   </div>
                   <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Próximos Relevos Programados</h3>
                </div>

                <div className="space-y-3">
                  {programmedShifts.length > 0 ? programmedShifts.map((prog: any) => (
                    <div key={prog.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-amber-200 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 group-hover:bg-amber-50 transition-colors">
                           <User size={18} className="text-gray-400 group-hover:text-amber-500" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{(prog.resources as any)?.name || 'Operador'}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{(prog.resources as any)?.role || 'Vigilador'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                         <div className="text-right">
                           <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Horario de Relevo</p>
                           <p className="text-sm font-mono font-black text-gray-900">
                              {new Date(prog.checkin_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(prog.checkout_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                           </p>
                         </div>
                         <Button variant="ghost" size="icon" className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl" onClick={async () => {
                            if(confirm("¿Cancelar este relevo programado?")) {
                               await supabase.from('guard_shifts').delete().eq('id', prog.id);
                               setProgrammedShifts(prev => prev.filter(p => p.id !== prog.id));
                            }
                         }}>
                            <X size={16} />
                         </Button>
                      </div>
                    </div>
                  )) : (
                    <div className="py-12 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest italic">
                      No hay relevos programados para hoy
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rondines' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Strategic Checkpoints */}
              <div className="lg:col-span-5 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Puntos de Control</h3>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    className="h-10 text-[10px] font-black uppercase tracking-widest px-4"
                    onClick={() => setIsAddingCheckpoint(true)}
                  >
                    <Plus size={14} className="mr-2" /> Agregar Punto
                  </Button>
                </div>

                <div className="space-y-3">
                  <AnimatePresence>
                    {isAddingCheckpoint && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <Card className="p-6 border-2 border-primary/20 bg-primary/5 rounded-3xl space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre del Punto</label>
                            <Input placeholder="Ej: Portón Norte A1" value={newCheckpoint.name} onChange={e => setNewCheckpoint({...newCheckpoint, name: e.target.value})} className="h-11 rounded-xl" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción / Instrucción</label>
                            <Input placeholder="Ej: Verificar cerraduras y cámaras" value={newCheckpoint.description} onChange={e => setNewCheckpoint({...newCheckpoint, description: e.target.value})} className="h-11 rounded-xl" />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button className="flex-1 h-11 bg-gray-900 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl shadow-gray-200" onClick={handleAddCheckpoint}>
                              Guardar Punto
                            </Button>
                            <Button variant="ghost" className="h-11 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-red-500" onClick={() => setIsAddingCheckpoint(false)}>
                              Cancelar
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {checkpoints.length > 0 ? (
                    checkpoints.map((cp, idx) => (
                      <Card key={cp.id} className="p-5 hover:shadow-lg transition-all border-none bg-white shadow-md shadow-gray-100 rounded-3xl group">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-gray-50 flex flex-col items-center justify-center shrink-0 border border-gray-100 group-hover:bg-primary/10 transition-colors">
                             <span className="text-[10px] font-black text-gray-300 group-hover:text-primary leading-none mb-0.5">{idx + 1}</span>
                             <Scan size={14} className="text-gray-300 group-hover:text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                             <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight truncate">{cp.name}</h4>
                             <p className="text-[10px] text-gray-400 font-medium mt-1 italic">{cp.description || 'Sin instrucciones adicionales'}</p>
                             <div className="flex items-center gap-2 mt-3">
                                <div className="px-2 py-0.5 bg-gray-50 rounded text-[8px] font-black text-gray-500 uppercase tracking-widest border border-gray-100">
                                   QR: {cp.qr_code || String(cp.id || '').substring(0, 8)}
                                </div>
                             </div>
                          </div>
                          <button onClick={() => handleDeleteCheckpoint(cp.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-200 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 mt-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </Card>
                    ))
                  ) : (
                    !isAddingCheckpoint && (
                      <div className="py-20 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                        <Scan size={40} className="text-gray-100 mx-auto mb-4" />
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">No hay puntos estratégicos</p>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Rounds History */}
              <div className="lg:col-span-7 space-y-6">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Historial de Patrullaje</h3>
                <Card className="overflow-hidden border-none shadow-2xl shadow-gray-200/30 rounded-3xl bg-white">
                  <div className="divide-y divide-gray-50">
                    {patrolRounds.length > 0 ? patrolRounds.map((round: any) => (
                      <div key={round.id} className="p-6 flex items-center justify-between hover:bg-gray-50/20 transition-colors group">
                        <div className="flex items-center gap-5">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center",
                            round.status === 'completed' ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                          )}>
                             {round.status === 'completed' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-black text-gray-900 uppercase tracking-tighter">Ronda de {round.resource_id || 'Operador'}</p>
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border",
                                round.status === 'completed' ? "bg-green-500 text-white border-green-500" : "bg-amber-500 text-white border-amber-500"
                              )}>
                                {round.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1.5">
                               <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                 <Clock size={12} className="text-gray-300" />
                                 Inició: {round.round_start ? new Date(round.round_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                               </div>
                               <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                 <Shield size={12} className="text-gray-300" />
                                 {round.status === 'completed' ? 'Patrulla Completa' : 'En Progreso'}
                               </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[10px] font-black uppercase"
                            onClick={async () => {
                              setSelectedRound(round);
                              setIsRoundMapOpen(true);
                              // Fetch path dynamically
                              if (round.round_start) {
                                const { data } = await supabase
                                  .from('tracking_logs')
                                  .select('latitude, longitude, timestamp')
                                  .eq('resource_id', round.resource_id)
                                  .gte('timestamp', round.round_start)
                                  .lte('timestamp', round.round_end || new Date().toISOString())
                                  .order('timestamp', { ascending: true });
                                setRoundPath(data || []);
                              }
                            }}
                          >
                            <MapPin size={12} className="mr-1" /> Ver Ruta GPS
                          </Button>
                          <ChevronRight size={18} className="text-gray-200 group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    )) : (
                      <div className="py-24 text-center">
                        <RotateCw size={48} className="text-gray-100 mx-auto mb-4" strokeWidth={1} />
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">Aún no se registran rondas</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'libro' && (
            <div className="space-y-6">
              {/* Formulario de Nueva Novedad */}
              <Card className="p-8 border-none shadow-2xl shadow-gray-200/30 rounded-3xl bg-white">
                <form onSubmit={handleAddBookEntry} className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Reportar Novedad</h3>
                    <div className="flex gap-2">
                      {['novedad', 'incidente', 'ronda'].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setNewEntryType(t)}
                          className={cn(
                            "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                            newEntryType === t 
                              ? "bg-gray-900 text-white shadow-lg" 
                              : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <textarea
                      required
                      value={newEntryContent}
                      onChange={e => setNewEntryContent(e.target.value)}
                      placeholder="Escribe aquí las novedades, incidencias o detalles del turno..."
                      className="w-full min-h-[120px] p-6 bg-gray-50 border-none rounded-2xl text-sm font-medium text-gray-700 placeholder:text-gray-300 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                    />
                    <Button 
                      type="submit" 
                      disabled={isSubmittingEntry || !newEntryContent.trim()}
                      className="absolute bottom-4 right-4 h-10 px-6 text-[10px] font-black uppercase tracking-widest shadow-xl group"
                    >
                      {isSubmittingEntry ? "Enviando..." : (
                        <>
                          Publicar <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Listado de Entradas */}
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
            </div>
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
                         <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{shift.operator_id || 'Recurso'}</p>
                         <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                           {shift.checkin_time ? new Date(shift.checkin_time).toLocaleDateString() : 'N/A'}
                         </p>
                       </div>
                     </div>
                     <div className="flex gap-12 text-right">
                        <div>
                           <p className="text-sm font-black text-gray-900">
                             {shift.checkin_time ? new Date(shift.checkin_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                           </p>
                           <p className="text-[9px] font-black text-gray-400 uppercase mt-0.5">Entrada</p>
                        </div>
                        <div>
                           <p className="text-sm font-black text-gray-900">
                             {shift.checkout_time ? new Date(shift.checkout_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
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

      {/* ====== MODAL: Asignar Personal ====== */}
      <BottomSheet isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Vincular Personal">
        <div className="space-y-6 pb-12 px-2">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <Input 
                placeholder="Buscar por nombre..." 
                value={assignSearch}
                onChange={e => setAssignSearch(e.target.value)}
                className="pl-10 h-14 rounded-2xl bg-gray-50 border-gray-100"
              />
            </div>
            <div className="flex items-center gap-2">
               <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase text-gray-400 ml-1">Desde</span>
                  <Input 
                    type="time" 
                    value={assignStartTime} 
                    onChange={e => setAssignStartTime(e.target.value)}
                    className="h-10 w-28 rounded-xl bg-gray-50"
                  />
               </div>
               <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase text-gray-400 ml-1">Hasta</span>
                  <Input 
                    type="time" 
                    value={assignEndTime} 
                    onChange={e => setAssignEndTime(e.target.value)}
                    className="h-10 w-28 rounded-xl bg-gray-50"
                  />
               </div>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {allStaff
              .filter(s => 
                s.name.toLowerCase().includes(assignSearch.toLowerCase()) || 
                s.role?.toLowerCase().includes(assignSearch.toLowerCase())
              )
              .map(staff => (
                <div 
                  key={staff.id} 
                  className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <User size={18} className="text-gray-400 group-hover:text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{staff.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{staff.role || 'Vigilador'}</p>
                    </div>
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant={staff.current_objective_id === id ? "outline" : "primary"}
                    disabled={isAssigning || staff.current_objective_id === id}
                    className="h-9 px-4 text-[10px] font-black uppercase tracking-widest"
                    onClick={() => handleAssign(staff.id)}
                  >
                    {staff.current_objective_id === id ? 'Ya vinculado' : 'Vincular'}
                  </Button>
                </div>
              ))}
            
            {allStaff.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-xs font-bold uppercase tracking-widest italic">
                No hay personal disponible para vincular
              </div>
            )}
            {/* Round Map Modal */}
            <AnimatePresence>
              {isRoundMapOpen && selectedRound && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => setIsRoundMapOpen(false)}
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[80vh]"
                  >
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between z-10 bg-white">
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">
                          Recorrido de Patrulla
                        </h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                          Auditoría GPS • Operador {selectedRound.resource_id}
                        </p>
                      </div>
                      <button onClick={() => setIsRoundMapOpen(false)} className="w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-500 transition-colors">
                        <X size={20} />
                      </button>
                    </div>
                    <div className="flex-1 relative bg-gray-100">
                       {roundPath.length > 0 ? (
                          <Map 
                             resources={[]} 
                             objectives={[]} 
                             onSelectObjective={() => {}} 
                             onSelectResource={() => {}} 
                             center={[roundPath[0].latitude, roundPath[0].longitude]}
                             pathData={roundPath.map(p => [p.latitude, p.longitude])}
                          />
                       ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                            <MapPin size={48} className="mb-4 opacity-20" />
                            <p className="text-sm font-black uppercase tracking-widest italic">No hay coordenadas registradas</p>
                          </div>
                       )}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </BottomSheet>

      {/* ====== MODAL: Enviar Mensaje Rápido ====== */}
      <BottomSheet isOpen={isMessageModalOpen} onClose={() => setIsMessageModalOpen(false)} title="Enviar Mensaje">
        <div className="space-y-6 pb-12 px-2">
          {selectedResForMsg && (
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
               <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100">
                  <User size={18} className="text-primary" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Para:</p>
                  <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{selectedResForMsg.name}</p>
               </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contenido del Mensaje</label>
            <textarea 
              placeholder="Escribe tu mensaje aquí..." 
              value={quickMessage}
              onChange={e => setQuickMessage(e.target.value)}
              className="w-full h-32 p-4 rounded-2xl bg-gray-50 border-gray-100 focus:border-primary focus:ring-0 text-sm font-medium resize-none"
            />
          </div>

          <Button 
            className="w-full h-14 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20"
            disabled={isSendingMsg || !quickMessage.trim()}
            onClick={handleSendQuickMessage}
          >
            {isSendingMsg ? <Loader2 className="animate-spin" /> : 'Enviar Mensaje Táctico'}
          </Button>
        </div>
      </BottomSheet>
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
