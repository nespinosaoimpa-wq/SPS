'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, User, Phone, Mail, MapPin, Calendar, 
  Clock, FileText, Shield, ChevronRight, Edit, Check, Search, Building2, X, Trash2, AlertTriangle,
  AlertOctagon, HardDrive, Scale, Receipt, Shirt, Briefcase, HeartPulse, History, Wallet
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

export default function GuardProfile() {
  const routeParams = useParams();
  const id = routeParams?.id as string | undefined;
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingShifts, setLoadingShifts] = useState(true);
  const [activeTab, setActiveTab] = useState('datos');

  const [shifts, setShifts] = useState<any[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleDeactivate = async () => {
    if (!profile) return;
    const confirm = window.confirm(`¿Estás seguro que deseas dar de baja a ${profile.name}? No podrá ingresar más al sistema.`);
    if (!confirm) return;

    setIsUpdating(true);
    try {
      await api.staff.update(profile.id, { status: 'baja' });
      alert("Personal dado de baja correctamente.");
      router.push('/gerente/personal');
    } catch (err: any) {
      alert("Error al dar de baja: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const fetchObjectives = async () => {
    try {
      const { data } = await supabase.from('objectives').select('id, name, client_name').eq('status', 'Activo');
      setObjectives(data || []);
    } catch (e) {
      console.error("Error fetching objectives:", e);
    }
  };

  const handleUpdateObjective = async (objectiveId: string | null) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('resources')
        .update({ current_objective_id: objectiveId })
        .eq('id', id);
      
      if (error) throw error;
      
      const selectedObj = objectives.find(o => o.id === objectiveId);
      setProfile((prev: any) => ({ 
        ...prev, 
        current_objective_id: objectiveId,
        objectives: selectedObj ? { name: selectedObj.name } : null 
      }));
      setIsAssignModalOpen(false);
    } catch (err: any) {
      alert("Error al actualizar objetivo: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const exportToExcel = () => {
    if (!shifts || shifts.length === 0) {
      alert("No hay turnos para exportar.");
      return;
    }

    const dataToExport = shifts.map(shift => {
      const start = new Date(shift.checkin_time);
      const end = shift.checkout_time ? new Date(shift.checkout_time) : null;
      let durationStr = "En curso";
      
      if (end) {
        const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        durationStr = diff.toFixed(2);
      }

      return {
        'Operador': profile.name,
        'DNI': profile.dni || '',
        'Fecha Incursión': start.toLocaleDateString('es-AR'),
        'Objetivo/Cliente': shift.objectives?.name || 'General',
        'Hora Entrada': start.toLocaleTimeString('es-AR'),
        'Hora Salida': end ? end.toLocaleTimeString('es-AR') : 'Activo',
        'Duración (Horas)': durationStr,
        'Geocerca OK': shift.checkin_within_geofence ? 'SÍ' : 'NO'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Planilla de Horas");
    
    // Save file
    XLSX.writeFile(workbook, `Fichaje_${profile.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      
      setLoading(true);
      setLoadingShifts(true);

      try {
        // 1. Fetch Profile first (Priority for UI)
        // Solo traemos los campos básicos y los JSONB necesarios para los tabs
        const fetchProfile = supabase
          .from('resources')
          .select('id, name, role, status, phone, email, dni, address, hiring_date, avatar_url, assigned_to, current_objective_id, shirt_size, pants_size, boot_size, last_uniform_delivery, credential_number, credential_expiry, sanctions, medical_records, leaves, documents, objectives(name)')
          .eq('id', id)
          .single();

        const timeout = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout de conexión')), 8000)
        );

        const { data: profileData, error: profileError } = await Promise.race([
          fetchProfile,
          timeout
        ]) as any;

        if (profileError) throw profileError;

        if (profileData && Array.isArray(profileData.objectives)) {
          profileData.objectives = profileData.objectives[0] || null;
        }
        setProfile(profileData);
        setLoading(false); // UI can render now

        // 2. Fetch Shifts in background
        // Usamos la sintaxis explícita de relación para evitar errores de ambigüedad
        const fetchShifts = supabase
          .from('guard_shifts')
          .select('id, checkin_time, checkout_time, status, operator_id, objective_id, duration_minutes, overtime_minutes, objectives!objective_id(name)')
          .or(profileData.assigned_to 
            ? `operator_id.eq.${id},operator_id.eq.${profileData.assigned_to}` 
            : `operator_id.eq.${id}`)
          .order('checkin_time', { ascending: false })
          .limit(30);

        let { data: shiftsData, error: shiftsError } = await Promise.race([
          fetchShifts,
          new Promise<any>((resolve) => setTimeout(() => resolve({ data: [], error: new Error('Timeout shifts') }), 5000))
        ]);
        
        // Fallback: Si falla el join por caché de esquema, traemos los turnos sin join
        if (shiftsError && (shiftsError.message.includes('relationship') || shiftsError.message.includes('objectives'))) {
          console.warn("Retrying shifts fetch without join due to schema error");
          const fetchShiftsFallback = supabase
            .from('guard_shifts')
            .select('id, checkin_time, checkout_time, status, operator_id, objective_id, duration_minutes, overtime_minutes')
            .or(profileData.assigned_to 
              ? `operator_id.eq.${id},operator_id.eq.${profileData.assigned_to}` 
              : `operator_id.eq.${id}`)
            .order('checkin_time', { ascending: false })
            .limit(30);
            
          const { data: retryData, error: retryError } = await Promise.race([
            fetchShiftsFallback,
            new Promise<any>((resolve) => setTimeout(() => resolve({ data: [], error: null }), 5000))
          ]);
          
          if (!retryError) shiftsData = retryData;
          else throw retryError;
        } else if (shiftsError) {
          throw shiftsError;
        }

        if (shiftsData) setShifts(shiftsData);

      } catch (e: any) {
        console.error("Error fetching data:", e);
        setErrorMsg(e.message || "Error al cargar el perfil");
      } finally {
        setLoading(false);
        setLoadingShifts(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-primary rounded-full animate-spin" />
        <p className="mt-3 text-sm text-gray-400">Cargando perfil...</p>
      </div>
    );
  }

  if (errorMsg || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-black text-gray-900 uppercase">Perfil no disponible</h2>
        <p className="mt-2 text-sm text-gray-500 max-w-sm mb-8">{errorMsg || "El registro no existe o hubo un problema al sincronizar con el servidor."}</p>
        <Link href="/gerente/personal">
          <Button variant="primary" className="uppercase font-black tracking-widest text-[10px]">
            Volver a Personal
          </Button>
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: 'datos', label: 'General', icon: User },
    { id: 'seguridad', label: 'Seguridad', icon: Shield },
    { id: 'liquidacion', label: 'Liquidación', icon: Wallet },
    { id: 'legajo', label: 'Legajo', icon: FileText },
    { id: 'historial', label: 'Asignaciones', icon: History },
  ];

  const isActive = profile.status === 'active' || profile.status === 'Activo';

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">

      {/* Back */}
      <Link href="/gerente/personal" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft size={16} /> Volver a Personal
      </Link>

      {/* Profile Header Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden border border-gray-100 shadow-sm">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <User size={32} className="text-gray-400" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{profile.name}</h1>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-semibold",
                isActive ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"
              )}>
                {isActive ? 'Activo' : profile.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">{profile.role || 'Sin cargo asignado'}</p>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Asignación:</span>
                <button 
                  onClick={() => { fetchObjectives(); setIsAssignModalOpen(true); }}
                  className="group flex items-center gap-1.5 px-2 py-1 bg-primary/5 hover:bg-primary/20 rounded-lg transition-all border border-primary/10"
                >
                  <Building2 size={12} className="text-primary" />
                  <span className="text-[11px] font-black text-gray-800 uppercase tracking-tight">
                    {profile.objectives?.name || 'Sin vincular'}
                  </span>
                  <Edit size={10} className="text-gray-400 group-hover:text-primary transition-colors ml-1" />
                </button>
              </div>

              {/* Access Status */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Acceso:</span>
                {profile.assigned_to ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-lg border border-green-100">
                    <Shield size={10} className="text-green-600" />
                    <span className="text-[9px] font-black text-green-700 uppercase">Habilitado</span>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      const msg = `Hola ${profile.name}, ya podés registrarte en el sistema 704: https://sps-psi-nine.vercel.app/register - Usá tu correo: ${profile.email}`;
                      navigator.clipboard.writeText(msg);
                      alert("Instrucciones copiadas. Ya podés pegarlas en WhatsApp para enviárselas.");
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-100 transition-all group"
                  >
                    <AlertTriangle size={10} className="text-amber-600 animate-pulse" />
                    <span className="text-[9px] font-black text-amber-700 uppercase">Pendiente de Registro</span>
                    <ChevronRight size={8} className="text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Legajo: {profile.id}</p>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            {profile.phone && (
              <a href={`tel:${profile.phone}`}>
                <Button variant="outline" size="icon">
                  <Phone size={16} />
                </Button>
              </a>
            )}
            {profile.email && (
              <a href={`mailto:${profile.email}`}>
                <Button variant="outline" size="icon">
                  <Mail size={16} />
                </Button>
              </a>
            )}
            <Button 
              variant="outline" 
              size="icon" 
              className="text-red-500 hover:bg-red-50 border-red-100"
              onClick={handleDeactivate}
              disabled={isUpdating}
              title="Dar de Baja"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1.5 rounded-[1.25rem] overflow-x-auto no-scrollbar whitespace-nowrap shadow-inner border border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shrink-0",
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm border border-gray-100"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-200/50"
            )}
          >
            <tab.icon size={14} className={activeTab === tab.id ? "text-primary" : "text-gray-400"} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'datos' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 p-8 rounded-[2rem]">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
               <User size={16} className="text-primary" /> Información de Identidad
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <InfoRow icon={User} label="Nombre completo" value={profile.name} />
              <InfoRow icon={FileText} label="DNI" value={profile.dni || 'No registrado'} />
              <InfoRow icon={Phone} label="Teléfono" value={profile.phone || 'No registrado'} />
              <InfoRow icon={Mail} label="Email" value={profile.email || 'No registrado'} />
              <InfoRow icon={MapPin} label="Dirección" value={profile.address || 'No registrada'} />
              <InfoRow icon={Calendar} label="Fecha de ingreso" value={profile.hiring_date ? new Date(profile.hiring_date).toLocaleDateString('es-AR') : 'No registrada'} />
              <InfoRow icon={Shield} label="Cargo" value={profile.role || 'Sin asignar'} />
              <InfoRow icon={Clock} label="Sueldo Base" value={profile.salary || 'A convenir'} />
            </div>
          </Card>

          <Card className="p-8 rounded-[2rem] bg-primary/5 border-primary/10">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
               <Shirt size={16} className="text-primary" /> Talles & Uniforme
            </h3>
            <div className="space-y-6">
              <InfoRow icon={Shirt} label="Talle Camisa / Chomba" value={profile.shirt_size || 'Sin definir'} />
              <InfoRow icon={FileText} label="Talle Pantalón" value={profile.pants_size || 'Sin definir'} />
              <InfoRow icon={Users} label="Calzado" value={profile.boot_size || 'Sin definir'} />
              <div className="pt-4 border-t border-primary/10">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Última Entrega</p>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <Calendar size={14} className="text-primary" />
                  {profile.last_uniform_delivery ? new Date(profile.last_uniform_delivery).toLocaleDateString('es-AR') : 'Nunca registrada'}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'seguridad' && (
        <div className="space-y-6">
          <Card className="p-8 rounded-[2rem]">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
               <Shield size={16} className="text-primary" /> Credenciales y Habilitaciones
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Credencial REPRIV / Trabajo</p>
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">
                           <FileText size={24} className="text-gray-400" />
                        </div>
                        <div>
                           <p className="text-lg font-black text-gray-900">{profile.credential_number || 'S/N'}</p>
                           <p className="text-[10px] font-bold text-gray-500 uppercase">Número de Identificación</p>
                        </div>
                     </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-gray-200">
                     <DocItem 
                        label="Vencimiento de Credencial" 
                        expiry={profile.credential_expiry} 
                     />
                  </div>
               </div>

               <div className="space-y-4">
                  <DocItem label="Examen Psicotécnico" expiry={profile.psych_expiry} />
                  <DocItem label="Licencia de Portación" expiry={profile.license_expiry} />
                  <DocItem label="Capacitación / Curso Ley" expiry={profile.training_expiry} />
               </div>
            </div>
          </Card>
          
          <Card className="p-8 rounded-[2rem] bg-amber-50 border-amber-100 border-dashed">
             <div className="flex gap-4 items-start text-amber-800">
                <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                <div>
                   <p className="text-xs font-black uppercase tracking-widest">Política de Seguridad</p>
                   <p className="text-xs font-medium mt-1 leading-relaxed">
                      El sistema notificará automáticamente al Gerente y al Operador 30 días antes de que cualquier credencial expire para iniciar el trámite de renovación.
                   </p>
                </div>
             </div>
          </Card>
        </div>
      )}

      {activeTab === 'liquidacion' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <Card className="p-6 rounded-[2rem] bg-gray-900 text-white shadow-2xl">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Total Horas Mes</p>
                <div className="flex items-end gap-2">
                   <h2 className="text-4xl font-black italic">
                      {shifts.reduce((acc, s) => acc + (s.checkout_time ? (new Date(s.checkout_time).getTime() - new Date(s.checkin_time).getTime()) / (1000 * 60 * 60) : 0), 0).toFixed(1)}
                   </h2>
                   <span className="text-primary font-black uppercase mb-1">HS</span>
                </div>
                <div className="mt-6 flex justify-between items-center text-[10px] font-black text-gray-400 uppercase">
                   <span>Regulares: {Math.min(160, shifts.reduce((acc, s) => acc + (s.checkout_time ? (new Date(s.checkout_time).getTime() - new Date(s.checkin_time).getTime()) / (1000 * 60 * 60) : 0), 0)).toFixed(1)}hs</span>
                   <span className="text-primary">Extras: {Math.max(0, shifts.reduce((acc, s) => acc + (s.checkout_time ? (new Date(s.checkout_time).getTime() - new Date(s.checkin_time).getTime()) / (1000 * 60 * 60) : 0), 0) - 160).toFixed(1)}hs</span>
                </div>
             </Card>
             <Card className="p-6 rounded-[2rem] bg-white border-gray-100 flex flex-col justify-between">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Días con Actividad</p>
                <div className="text-3xl font-black text-gray-900 italic">
                   {new Set(shifts.map(s => new Date(s.checkin_time).toDateString())).size} / 30
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full mt-4 overflow-hidden">
                   <div className="h-full bg-green-500" style={{ width: `${(new Set(shifts.map(s => new Date(s.checkin_time).toDateString())).size / 30) * 100}%` }} />
                </div>
             </Card>
             <Card className="p-6 rounded-[2rem] bg-white border-gray-100 flex flex-col justify-between">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Estimado Liquidación</p>
                <div className="text-3xl font-black text-primary italic">
                   ${(shifts.reduce((acc, s) => acc + (s.checkout_time ? (new Date(s.checkout_time).getTime() - new Date(s.checkin_time).getTime()) / (1000 * 60 * 60) : 0), 0) * 2500).toLocaleString('es-AR')}
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-2">Valor Base Sugerido ($2.500/hs)</p>
             </Card>
          </div>

          <Card className="p-8 rounded-[2rem]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                 <Receipt size={16} className="text-primary" /> Planilla Detallada por Día
              </h3>
              <Button onClick={exportToExcel} variant="outline" size="sm" className="h-10 px-6 gap-2 rounded-xl text-[10px] font-black uppercase">
                 <Download size={14} /> Exportar Planilla
              </Button>
            </div>
            
            <div className="space-y-3">
              {loadingShifts ? (
                <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <div className="w-6 h-6 border-2 border-gray-200 border-t-primary rounded-full animate-spin mb-3" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Calculando planilla...</p>
                </div>
              ) : shifts.length > 0 ? (
                shifts.map((shift, i) => {
                  const start = new Date(shift.checkin_time);
                  const end = shift.checkout_time ? new Date(shift.checkout_time) : null;
                  const duration = end ? ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(1) : 'En curso';
                  
                  return (
                    <div key={i} className="flex items-center justify-between p-5 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-white hover:shadow-lg hover:border-primary/20 transition-all group">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-white flex flex-col items-center justify-center border border-gray-100 shadow-sm group-hover:bg-primary group-hover:text-black transition-colors">
                           <span className="text-[9px] font-black uppercase leading-none">{start.toLocaleString('es-AR', { month: 'short' })}</span>
                           <span className="text-lg font-black italic leading-none">{start.getDate()}</span>
                        </div>
                        <div>
                           <p className="text-sm font-black text-gray-900 uppercase italic leading-none mb-1">{shift.objectives?.name || 'General'}</p>
                           <p className="text-[10px] text-gray-500 font-bold uppercase">
                              {start.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs → {end ? end.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : 'Activo'}
                           </p>
                        </div>
                      </div>
                      <div className="text-right">
                         <p className="text-lg font-black text-gray-900 italic leading-none">{duration} hs</p>
                         <p className={cn("text-[9px] font-black uppercase mt-1", end ? "text-green-600" : "text-amber-600 animate-pulse")}>
                            {end ? 'Registrado' : 'En Turno'}
                         </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <Clock size={32} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Sin registros de tiempo</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'legajo' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <Card className="p-8 rounded-[2rem]">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2 text-red-600">
                 <AlertOctagon size={16} /> Sanciones & Disciplina
              </h3>
              <div className="space-y-4">
                 {profile.sanctions && profile.sanctions.length > 0 ? (
                    profile.sanctions.map((s: any, i: number) => (
                       <div key={i} className="p-4 bg-red-50 rounded-2xl border border-red-100">
                          <div className="flex justify-between items-start mb-2">
                             <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">{s.severity}</span>
                             <span className="text-[10px] text-red-400 font-bold">{new Date(s.date).toLocaleDateString('es-AR')}</span>
                          </div>
                          <p className="text-xs font-bold text-gray-800">{s.reason}</p>
                       </div>
                    ))
                 ) : (
                    <div className="text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                       <CheckCircle2 size={24} className="text-green-500 mx-auto mb-2" />
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sin sanciones vigentes</p>
                    </div>
                 )}
                 <Button variant="outline" className="w-full h-12 rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-[10px] font-black uppercase mt-4">
                    Registrar Sanción
                 </Button>
              </div>
           </Card>

           <Card className="p-8 rounded-[2rem]">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <HeartPulse size={16} className="text-primary" /> Carpetas & Licencias
              </h3>
              <div className="space-y-4">
                 {profile.leaves && profile.leaves.length > 0 ? (
                    profile.leaves.map((l: any, i: number) => (
                       <div key={i} className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex justify-between items-center">
                          <div>
                             <p className="text-xs font-black text-gray-900 uppercase">{l.type}</p>
                             <p className="text-[10px] text-blue-600 font-bold uppercase">{l.duration} días - Art. {l.article || 'S/N'}</p>
                          </div>
                          <span className="text-[10px] text-gray-400 font-bold">{new Date(l.date).toLocaleDateString('es-AR')}</span>
                       </div>
                    ))
                 ) : (
                    <div className="text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sin carpetas médicas recientes</p>
                    </div>
                 )}
                 <Button variant="outline" className="w-full h-12 rounded-xl border-primary/20 text-primary hover:bg-primary/5 text-[10px] font-black uppercase mt-4">
                    Cargar Licencia / Médica
                 </Button>
              </div>
           </Card>

           <Card className="md:col-span-2 p-8 rounded-[2rem]">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <HardDrive size={16} className="text-primary" /> Documentación & Actas Escaneadas
                 </h3>
                 <Button variant="primary" className="h-10 px-6 rounded-xl text-[10px] font-black uppercase">
                    Subir Archivo
                 </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                 {profile.documents && profile.documents.length > 0 ? (
                    profile.documents.map((doc: any, i: number) => (
                       <div key={i} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex items-center gap-4 hover:border-primary transition-all cursor-pointer group">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 group-hover:bg-primary transition-colors">
                             <FileText size={18} className="text-gray-400 group-hover:text-black" />
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="text-xs font-black text-gray-900 uppercase truncate">{doc.name}</p>
                             <p className="text-[9px] text-gray-400 font-bold">{new Date(doc.uploaded_at).toLocaleDateString('es-AR')}</p>
                          </div>
                       </div>
                    ))
                 ) : (
                    <div className="sm:col-span-2 lg:col-span-3 text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No hay documentos digitalizados</p>
                    </div>
                 )}
              </div>
           </Card>
        </div>
      )}

      {activeTab === 'historial' && (
        <Card className="p-8 rounded-[2rem]">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
             <History size={16} className="text-primary" /> Historial de Asignaciones
          </h3>
          {/* ... existing shifts code slightly refined if needed ... */}
          {/* Reutilizando la lógica de historial anterior pero con mejor estilo */}
          {shifts.length > 0 ? (
            <div className="space-y-4">
              {shifts.map((shift, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black italic">
                      {shift.objectives?.name?.[0] || 'O'}
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 uppercase italic">{shift.objectives?.name || 'Turno sin objetivo'}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">{new Date(shift.checkin_time).toLocaleString('es-AR')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-xs text-gray-400 font-black uppercase">Sin historial previo</p>
            </div>
          )}
        </Card>
      )}

      {/* MODAL: Seleccionar Objetivo */}
      <BottomSheet 
        isOpen={isAssignModalOpen} 
        onClose={() => setIsAssignModalOpen(false)} 
        title="Vincular a Objetivo"
      >
        <div className="space-y-6 pb-12">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <Input 
              placeholder="Buscar objetivo..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 h-14 rounded-2xl bg-gray-50 border-gray-100 uppercase text-xs font-bold"
            />
          </div>

          <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
            <button
               onClick={() => handleUpdateObjective(null)}
               className={cn(
                 "w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left group",
                 !profile.current_objective_id 
                   ? "bg-primary/5 border-primary/20" 
                   : "bg-white border-gray-100 hover:border-red-200 hover:bg-red-50"
               )}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-red-100 transition-colors">
                  <X size={18} className="text-gray-400 group-hover:text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Desvincular</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Sin seguimiento activo</p>
                </div>
              </div>
              {!profile.current_objective_id && <Check size={18} className="text-primary" />}
            </button>

            {objectives
              .filter(obj => obj.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(obj => (
                <button
                  key={obj.id}
                  onClick={() => handleUpdateObjective(obj.id)}
                  disabled={isUpdating}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left group",
                    profile.current_objective_id === obj.id
                      ? "bg-primary/5 border-primary/20"
                      : "bg-white border-gray-100 hover:border-primary/20 hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Building2 size={18} className="text-gray-400 group-hover:text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{obj.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">{obj.client_name || 'Particular'}</p>
                    </div>
                  </div>
                  {profile.current_objective_id === obj.id && <Check size={18} className="text-primary" />}
                </button>
              ))}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={14} className="text-gray-400" />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function DocItem({ label, expiry }: { label: string, expiry?: string }) {
  const isExpired = expiry ? new Date(expiry) < new Date() : false;
  const isNearExpiry = expiry ? (new Date(expiry).getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000 : false;

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-2 h-2 rounded-full",
          !expiry ? "bg-gray-300" :
          isExpired ? "bg-red-500" :
          isNearExpiry ? "bg-amber-500" :
          "bg-green-500"
        )} />
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <span className={cn(
        "text-xs font-medium",
        !expiry ? "text-gray-400" :
        isExpired ? "text-red-500" :
        isNearExpiry ? "text-amber-500" :
        "text-green-600"
      )}>
        {expiry 
          ? (isExpired ? 'Vencido' : `Vence: ${new Date(expiry).toLocaleDateString('es-AR')}`)
          : 'Sin registrar'
        }
      </span>
    </div>
  );
}
