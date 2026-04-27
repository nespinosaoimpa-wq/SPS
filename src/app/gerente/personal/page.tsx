'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Search, Plus, ChevronRight, Phone, Mail, User, Download,
  CheckCircle2, AlertCircle, Clock, X
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { api } from '@/lib/api';
import { isConfigured } from '@/lib/supabase';

export default function PersonalPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('Todos');
  
  const [newStaff, setNewStaff] = useState({
    id: '', name: '', role: '', phone: '', email: '', dni: '', status: 'active',
    current_objective_id: '', contract_name: '', contract_date: '', avatar_url: ''
  });

  const [objectives, setObjectives] = useState<any[]>([]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const [staffData, objectivesData] = await Promise.all([
        api.staff.list(),
        api.objectives.list()
      ]);
      setStaff(Array.isArray(staffData) ? staffData : []);
      setObjectives(Array.isArray(objectivesData) ? objectivesData : []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Omit manual id and normalize email
      const { id, ...staffData } = newStaff;
      const normalizedData: any = {
        ...staffData,
        email: staffData.email.toLowerCase().trim()
      };
      
      // Only include ID if explicitly provided (manual Legajo)
      if (id && id.trim()) {
        normalizedData.id = id.trim();
      }
      
      await api.staff.create(normalizedData);
      setIsModalOpen(false);
      setNewStaff({ 
        id: '', name: '', role: '', phone: '', email: '', dni: '', status: 'active',
        current_objective_id: '', contract_name: '', contract_date: '', avatar_url: ''
      });
      fetchStaff();
    } catch (err) {
      alert("Error al crear: " + (err as any).message);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewStaff({ ...newStaff, avatar_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredStaff = useMemo(() => {
    let list = staff.filter(s => 
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filter === 'Activos') list = list.filter(s => s.status === 'active' || s.status === 'Activo');
    if (filter === 'Inactivos') list = list.filter(s => s.status !== 'active' && s.status !== 'Activo');
    return list;
  }, [searchTerm, staff, filter]);

  const activeCount = staff.filter(s => s.status === 'active' || s.status === 'Activo').length;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Personal</h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-gray-200 rounded-full shadow-sm">
               <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isConfigured ? "bg-green-500" : "bg-amber-500")} />
               <span className="text-[10px] font-black uppercase text-gray-400">{isConfigured ? 'Live' : 'Demo'}</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">{staff.length} empleados · {activeCount} activos</p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Alta de Personal
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: staff.length, icon: Users, color: 'text-gray-700', bg: 'bg-gray-100' },
          { label: 'Activos', value: activeCount, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'En Servicio', value: activeCount, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Alertas', value: 0, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg, stat.color)}>
                <stat.icon size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o cargo..."
            className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          {['Todos', 'Activos', 'Inactivos'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-semibold transition-all",
                filter === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Staff List */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-gray-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Users size={40} className="text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">No se encontró personal</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredStaff.map((person, i) => (
              <Link key={person.id} href={`/gerente/personal/${person.id}`}>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden border border-gray-100">
                    {person.avatar_url ? (
                      <img src={person.avatar_url} alt={person.name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={18} className="text-gray-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{person.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-500">{person.role || 'Sin cargo asignado'}</p>
                      {person.current_objective_id && (
                        <>
                          <span className="text-gray-300">•</span>
                          <div className="flex items-center gap-1 text-[10px] text-primary font-bold uppercase tracking-tight">
                            <MapPin size={10} />
                            Asignado
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-semibold shrink-0",
                    (person.status === 'active' || person.status === 'Activo')
                      ? "bg-green-50 text-green-600"
                      : "bg-gray-100 text-gray-500"
                  )}>
                    {person.status === 'active' || person.status === 'Activo' ? 'Activo' : person.status || 'Inactivo'}
                  </div>

                  <ChevronRight size={16} className="text-gray-300 shrink-0" />
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* ====== MODAL: Alta de Personal ====== */}
      <BottomSheet isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Alta de Personal">
        <form onSubmit={handleCreateStaff} className="space-y-6 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Información Básica</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase ml-1">Nombre Completo</span>
                  <Input required placeholder="Juan Pérez" value={newStaff.name}
                    onChange={e => setNewStaff({...newStaff, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase ml-1">Cargo</span>
                  <Input required placeholder="Vigilador" value={newStaff.role}
                    onChange={e => setNewStaff({...newStaff, role: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase ml-1">DNI</span>
                  <Input required placeholder="30.123.456" value={newStaff.dni}
                    onChange={e => setNewStaff({...newStaff, dni: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase ml-1">
                    {newStaff.role.toLowerCase().includes('gerente') ? 'Legajo (Opcional por rango)' : 'Legajo / ID'}
                  </span>
                  <Input 
                    placeholder="Ej: S-710" 
                    value={newStaff.id}
                    onChange={e => setNewStaff({...newStaff, id: e.target.value})} 
                  />
                  <p className="text-[9px] text-gray-400 ml-1 italic font-medium">Si se deja vacío, el sistema asignará una identidad digital automática.</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2 pt-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contacto y Cuenta de Acceso</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase ml-1">Email (Gmail Personal)</span>
                  <Input required type="email" placeholder="ejemplo@gmail.com" value={newStaff.email}
                    onChange={e => setNewStaff({...newStaff, email: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase ml-1">Teléfono</span>
                  <Input required placeholder="+54 9 342..." value={newStaff.phone}
                    onChange={e => setNewStaff({...newStaff, phone: e.target.value})} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase ml-1">Tipo de Acceso al Sistema</span>
                  <select 
                    className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={(() => {
                      if (newStaff.role.toLowerCase().includes('gerente')) return 'gerente';
                      return 'operador';
                    })()}
                    onChange={e => {
                      const val = e.target.value;
                      setNewStaff({
                        ...newStaff,
                        role: val === 'gerente' ? 'Gerente Operativo' : 'Vigilador'
                      });
                    }}
                  >
                    <option value="operador">Operador (Acceso a rondines y mapa táctico)</option>
                    <option value="gerente">Gerente (Acceso total a finanzas y personal)</option>
                  </select>
                </div>
              </div>
              <p className="text-[10px] text-amber-600 font-medium mt-2 px-1">
                ⚠️ El acceso se habilitará automáticamente para este email con la contraseña: <b>7042026</b>
              </p>
            </div>

            <div className="space-y-1.5 sm:col-span-2 pt-4">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Foto de Perfil</label>
              <div className="flex items-center gap-4 mt-2">
                <div className="w-20 h-20 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                  {newStaff.avatar_url ? (
                    <img src={newStaff.avatar_url} alt="Min" className="w-full h-full object-cover" />
                  ) : (
                    <User size={24} className="text-gray-300" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label 
                    htmlFor="photo-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold uppercase cursor-pointer hover:bg-gray-50 transition-all"
                  >
                    <Plus size={14} /> Seleccionar Foto
                  </label>
                  <p className="text-[10px] text-gray-400 mt-2">Formatos aceptados: JPG, PNG. Máximo 2MB.</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2 pt-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Asignación Operativa</label>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase ml-1">Objetivo Asignado</span>
                <select 
                  className="w-full h-11 border border-gray-200 rounded-xl px-4 text-sm bg-gray-50 focus:bg-white transition-all appearance-none outline-none focus:ring-2 focus:ring-primary/20"
                  value={newStaff.current_objective_id}
                  onChange={e => setNewStaff({...newStaff, current_objective_id: e.target.value})}
                >
                  <option value="">-- No asignado aún (Sin puesto fijo) --</option>
                  {objectives.map(obj => (
                    <option key={obj.id} value={obj.id}>{obj.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2 pt-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Documentación y Contrato</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase ml-1">Título del Contrato</span>
                  <Input placeholder="Ej: Contrato Indefinido 2026" value={newStaff.contract_name}
                    onChange={e => setNewStaff({...newStaff, contract_name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase ml-1">Fecha de Contrato</span>
                  <Input type="date" value={newStaff.contract_date}
                    onChange={e => setNewStaff({...newStaff, contract_date: e.target.value})} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl text-xs font-bold uppercase" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" className="flex-1 h-12 rounded-xl text-xs font-bold uppercase shadow-lg shadow-primary/20">
              Registrar Personal
            </Button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}

function MapPin({ size, className }: { size: number, className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  );
}
