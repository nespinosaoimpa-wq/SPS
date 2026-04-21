'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, User, Phone, Mail, MapPin, Calendar, 
  Clock, FileText, Shield, ChevronRight, Edit, Check, Search, Building2, X, Trash2, AlertTriangle
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

export default function GuardProfile() {
  const routeParams = useParams();
  const id = routeParams?.id as string | undefined;
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('resources')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        setProfile(data);

        // Fetch guard shifts
        const { data: shiftsData } = await supabase
          .from('guard_logs')
          .select('*, objectives(name)')
          .eq('resource_id', id)
          .order('clock_in', { ascending: false })
          .limit(10);
        
        if (shiftsData) setShifts(shiftsData);
      } catch (e) {
        console.error("Error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [id]);

  if (loading || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-primary rounded-full animate-spin" />
        <p className="mt-3 text-sm text-gray-400">Cargando perfil...</p>
      </div>
    );
  }

  const tabs = [
    { id: 'datos', label: 'Datos' },
    { id: 'documentacion', label: 'Documentación' },
    { id: 'historial', label: 'Historial' },
    { id: 'rendimiento', label: 'Rendimiento' },
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
                      const msg = `Hola ${profile.name}, ya podés registrarte en el sistema SPS: https://sps-psi-nine.vercel.app/register - Usá tu correo: ${profile.email}`;
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
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all",
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'datos' && (
        <Card className="p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Datos Personales</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InfoRow icon={User} label="Nombre completo" value={profile.name} />
            <InfoRow icon={FileText} label="DNI" value={profile.dni || 'No registrado'} />
            <InfoRow icon={Phone} label="Teléfono" value={profile.phone || 'No registrado'} />
            <InfoRow icon={Mail} label="Email" value={profile.email || 'No registrado'} />
            <InfoRow icon={MapPin} label="Dirección" value={profile.address || 'No registrada'} />
            <InfoRow icon={Calendar} label="Fecha de ingreso" value={profile.hiring_date ? new Date(profile.hiring_date).toLocaleDateString('es-AR') : 'No registrada'} />
            <InfoRow icon={Shield} label="Cargo" value={profile.role || 'Sin asignar'} />
            <InfoRow icon={Clock} label="Salario" value={profile.salary || 'No especificado'} />
          </div>
        </Card>
      )}

      {activeTab === 'documentacion' && (
        <Card className="p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Estado Documental</h3>
          <div className="space-y-3">
            <DocItem 
              label="Psicotécnico" 
              expiry={profile.psych_expiry} 
            />
            <DocItem 
              label="Licencia de Portación" 
              expiry={profile.license_expiry} 
            />
            <DocItem 
              label="Capacitación" 
              expiry={profile.training_expiry} 
            />
          </div>
        </Card>
      )}

      {activeTab === 'historial' && (
        <Card className="p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Historial de Objetivos y Turnos</h3>
          {shifts.length > 0 ? (
            <div className="space-y-4">
              {shifts.map((shift, i) => {
                const duration = shift.clock_out 
                  ? ((new Date(shift.clock_out).getTime() - new Date(shift.clock_in).getTime()) / (1000 * 60 * 60)).toFixed(1)
                  : 'En curso';
                
                return (
                  <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <div className="flex gap-4 items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {shift.objectives?.name?.[0] || 'O'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{shift.objectives?.name || 'Turno sin objetivo'}</p>
                        <p className="text-xs text-gray-500">Inicio: {new Date(shift.clock_in).toLocaleString('es-AR')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{duration} hs</p>
                      <p className="text-[10px] text-gray-400">{shift.clock_out ? 'Completado' : 'Activo'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No hay turnos registrados aún.</p>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'rendimiento' && (
        <Card className="p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Rendimiento Mensual</h3>
          {profile.performance_data && Array.isArray(profile.performance_data) ? (
            <div className="space-y-3">
              {profile.performance_data.map((month: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium text-gray-700">{month.month}</span>
                  <div className="flex gap-6">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{month.hours}h</p>
                      <p className="text-[10px] text-gray-400">Horas</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{month.punctuality}%</p>
                      <p className="text-[10px] text-gray-400">Puntualidad</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{month.incidents}</p>
                      <p className="text-[10px] text-gray-400">Incidentes</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-gray-400">Sin datos de rendimiento</p>
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
  const isNearExpiry = expiry ? (new Date(expiry).getTime() - Date.now()) < 90 * 24 * 60 * 60 * 1000 : false;

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
