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


function LiveIndicator({ lastUpdate }: { lastUpdate?: string }) {
  const [isLive, setIsLive] = React.useState(false);

  React.useEffect(() => {
    if (!lastUpdate) return;
    const check = () => {
      const diff = (Date.now() - new Date(lastUpdate).getTime()) / 1000 / 60;
      setIsLive(!isNaN(diff) && diff < 5);
    };
    check();
    const timer = setInterval(check, 30000);
    return () => clearInterval(timer);
  }, [lastUpdate]);

  if (!isLive) return null;

  return (
    <div className="flex items-center gap-1 text-[8px] font-black text-green-500 uppercase tracking-widest bg-green-50 px-1.5 py-0.5 rounded animate-pulse">
      <div className="w-1 h-1 bg-green-500 rounded-full" />
      En Vivo
    </div>
  );
}

export default function PersonalPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('Todos');
  
  const [newStaff, setNewStaff] = useState({
    id: '', name: '', role: '', phone: '', email: '', dni: '', status: 'active',
    current_objective_id: '', contract_name: '', contract_date: '', avatar_url: '',
    shirt_size: '', pants_size: '', boot_size: '', credential_number: '', credential_expiry: ''
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
        current_objective_id: '', contract_name: '', contract_date: '', avatar_url: '',
        shirt_size: '', pants_size: '', boot_size: '', credential_number: '', credential_expiry: ''
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
    <div className="p-6 lg:p-10 space-y-12 max-w-7xl mx-auto bg-zinc-950 min-h-screen text-zinc-100 pb-32">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 pb-10 border-b border-white/10">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Gestión de Personal</h1>
            <div className="status-label bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
               <div className="status-dot bg-emerald-500" />
               <span className="data-mono">{isConfigured ? 'Live' : 'Demo'}</span>
            </div>
          </div>
          <p className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mt-3">
            {staff.length} Operativos Registrados · {activeCount} En Servicio
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="btn-premium h-14 px-10">
          <Plus size={20} /> Alta de Personal
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Fuerza Total', value: staff.length, icon: Users, color: 'text-zinc-100', bg: 'bg-zinc-900' },
          { label: 'Operativos Activos', value: activeCount, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/5' },
          { label: 'En Despliegue', value: activeCount, icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/5' },
          { label: 'Alertas Sistema', value: 0, icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/5' },
        ].map((stat, i) => (
          <div key={i} className="card-tactical p-8 group hover:border-white/10 transition-colors">
            <div className="flex items-center gap-6">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border border-white/5", stat.bg, stat.color)}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-3xl font-black text-white tabular-nums tracking-tighter">{stat.value}</p>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="BUSCAR POR NOMBRE O RANGO..."
            className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold placeholder:text-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all uppercase tracking-tight"
          />
        </div>
        <div className="flex bg-zinc-900/50 p-1.5 rounded-2xl border border-white/5">
          {['Todos', 'Activos', 'Inactivos'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                filter === f 
                  ? "bg-zinc-800 text-white shadow-xl" 
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Staff List */}
      <div className="card-tactical overflow-hidden border-none bg-transparent">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-10 h-10 border-4 border-zinc-900 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-white/5 rounded-[3rem] bg-zinc-900/20">
            <Users size={60} className="text-zinc-800 mb-6" />
            <p className="text-xs font-black text-zinc-600 uppercase tracking-[0.3em] italic">No se ha detectado personal bajo estos parámetros</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredStaff.map((person, i) => (
              <Link key={person.id} href={`/gerente/personal/${person.id}`}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card-tactical p-8 group hover:border-primary/30 transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <User size={100} className="text-white" />
                  </div>

                  <div className="flex items-start justify-between mb-8">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-[2rem] bg-zinc-800 border border-white/5 flex items-center justify-center overflow-hidden shadow-2xl group-hover:border-primary/20 transition-colors">
                        {person.avatar_url ? (
                          <img src={person.avatar_url} alt={person.name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={32} className="text-zinc-600" />
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1">
                        <LiveIndicator lastUpdate={person.last_gps_update} />
                      </div>
                    </div>
                    <div className={cn(
                      "status-label border-none px-4",
                      (person.status === 'active' || person.status === 'Activo')
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-zinc-800 text-zinc-500"
                    )}>
                      {person.status === 'active' || person.status === 'Activo' ? 'Activo' : person.status || 'Inactivo'}
                    </div>
                  </div>

                  <div className="space-y-4 relative z-10">
                    <div>
                      <p className="text-xl font-black text-white uppercase tracking-tighter group-hover:text-primary transition-colors truncate">
                        {person.name}
                      </p>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">
                        {person.role || 'Operativo Táctico'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                      {person.current_objective_id ? (
                        <div className="flex items-center gap-3">
                          <MapPin size={12} className="text-primary" />
                          <span className="text-[10px] font-black text-zinc-300 uppercase tracking-tight truncate">
                            {objectives.find(o => o.id === person.current_objective_id)?.name || 'Asignado a Puesto'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 opacity-30">
                          <MapPin size={12} className="text-zinc-500" />
                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tight">Sin Objetivo Fijo</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <Clock size={12} className="text-zinc-600" />
                        <span className="data-mono text-[10px] text-zinc-500">SPS-{person.id?.split('-')[0].toUpperCase()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-between">
                    <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest group-hover:text-zinc-400 transition-colors">Ver Perfil 360</span>
                    <ChevronRight size={14} className="text-zinc-700 group-hover:text-primary transition-all translate-x-0 group-hover:translate-x-1" />
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ====== MODAL: Alta de Personal ====== */}
      <BottomSheet isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registro de Personal Táctico">
        <form onSubmit={handleCreateStaff} className="space-y-8 pb-10 bg-zinc-950 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* ... Form styling already follows tactical premium in its structure, but could use more zinc-900/80 classes ... */}
            {/* (Keeping form functional logic as is, but ensuring visual consistency) */}
            <div className="space-y-6 md:col-span-2">
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4">Módulo de Reclutamiento</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-zinc-500 uppercase ml-1">Nombre Completo</span>
                  <input required placeholder="OPERATIVO..." className="w-full h-14 bg-zinc-900 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:ring-2 focus:ring-primary/20 outline-none" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-zinc-500 uppercase ml-1">Rango / Función</span>
                  <input required placeholder="VIGILADOR..." className="w-full h-14 bg-zinc-900 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:ring-2 focus:ring-primary/20 outline-none" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-zinc-500 uppercase ml-1">Documento (DNI)</span>
                  <input required placeholder="DNI..." className="w-full h-14 bg-zinc-900 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:ring-2 focus:ring-primary/20 outline-none" value={newStaff.dni} onChange={e => setNewStaff({...newStaff, dni: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-zinc-500 uppercase ml-1">Legajo Personal</span>
                  <input placeholder="ID TÁCTICO..." className="w-full h-14 bg-zinc-900 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:ring-2 focus:ring-primary/20 outline-none" value={newStaff.id} onChange={e => setNewStaff({...newStaff, id: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Email & Contact */}
            <div className="space-y-6 md:col-span-2">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Acceso y Contacto</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-zinc-500 uppercase ml-1">Gmail de Acceso</span>
                  <input required type="email" placeholder="GMAIL..." className="w-full h-14 bg-zinc-900 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:ring-2 focus:ring-primary/20 outline-none" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-zinc-500 uppercase ml-1">Teléfono Enlace</span>
                  <input required placeholder="WHATSAPP..." className="w-full h-14 bg-zinc-900 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:ring-2 focus:ring-primary/20 outline-none" value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} />
                </div>
              </div>
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6">
                <p className="text-[10px] text-primary font-black uppercase tracking-widest leading-relaxed">
                  ⚠️ EL ACCESO SE HABILITARÁ CON LA CLAVE PREDETERMINADA: 7042026. EL OPERADOR DEBERÁ CAMBIARLA EN SU PRIMER INGRESO.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-8">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 h-16 bg-zinc-900 text-zinc-500 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:text-white transition-colors">
              Abortar
            </button>
            <button type="submit" className="flex-1 h-16 btn-premium">
              Registrar Operativo
            </button>
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
