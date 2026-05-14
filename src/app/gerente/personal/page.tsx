'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Plus, ChevronRight, Phone, Mail, User,
  CheckCircle2, AlertCircle, Clock, X, AlertTriangle, ShieldCheck, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { api } from '@/lib/api';
import { isConfigured } from '@/lib/supabase';

// Days until credential expiry
function daysUntilExpiry(expiry: string | null): number | null {
  if (!expiry) return null;
  return Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function PersonalPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('Todos');

  const emptyForm = {
    id: '', name: '', role: '', phone: '', email: '', dni: '',
    address: '', status: 'active', current_objective_id: '',
    shirt_size: '', pants_size: '', boot_size: '',
    credential_number: '', credential_expiry: '', hourly_pay_rate: ''
  };
  const [newStaff, setNewStaff] = useState({ ...emptyForm });
  const [objectives, setObjectives] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

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
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { id, ...staffData } = newStaff;
      const normalizedData: any = {
        ...staffData,
        email: staffData.email.toLowerCase().trim(),
        hourly_pay_rate: staffData.hourly_pay_rate ? parseFloat(staffData.hourly_pay_rate) : null,
      };
      if (id && id.trim()) normalizedData.id = id.trim();
      // Convert empty strings → null for DB compatibility
      Object.keys(normalizedData).forEach(k => {
        if (normalizedData[k] === '') normalizedData[k] = null;
      });
      await api.staff.create(normalizedData);
      setIsModalOpen(false);
      setNewStaff({ ...emptyForm });
      fetchStaff();
    } catch (err) {
      alert('Error al crear: ' + (err as any).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSoftDelete = async (id: string, name: string) => {
    if (!confirm(`¿Confirmar baja lógica de ${name}? El operador no podrá acceder al sistema.`)) return;
    try {
      await api.staff.update(id, { status: 'baja' });
      fetchStaff();
    } catch (err) {
      alert('Error al dar de baja: ' + (err as any).message);
    }
  };

  const filteredStaff = useMemo(() => {
    let list = staff.filter(s =>
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.dni?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filter === 'Activos') list = list.filter(s => s.status === 'active' || s.status === 'Activo');
    if (filter === 'Inactivos') list = list.filter(s => s.status !== 'active' && s.status !== 'Activo' && s.status !== 'baja');
    return list;
  }, [searchTerm, staff, filter]);

  const activeCount = staff.filter(s => s.status === 'active' || s.status === 'Activo').length;
  // Credenciales próximas a vencer en 30 días
  const expiringCount = staff.filter(s => {
    const days = daysUntilExpiry(s.credential_expiry);
    return days !== null && days <= 30 && days >= 0;
  }).length;

  const Field = ({ label, ...props }: any) => (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider ml-1">{label}</label>
      <input
        className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 text-sm font-semibold text-zinc-800 focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37]/50 outline-none transition-all"
        {...props}
      />
    </div>
  );

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-7xl mx-auto bg-zinc-50 min-h-screen pb-32">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 pb-10 border-b-2 border-zinc-200">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-white border-2 border-zinc-200 rounded-2xl flex items-center justify-center shadow-sm">
            <Users size={32} className="text-zinc-950" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-zinc-950 tracking-tighter uppercase">Gestión de Personal</h1>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex items-center gap-2 px-3 py-1 bg-white text-zinc-600 border-2 border-zinc-200 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                <span className="w-2 h-2 bg-[#D4AF37] rounded-full animate-pulse" />
                SPS Realtime Hub
              </span>
              <p className="text-[11px] font-black text-zinc-600 uppercase tracking-widest">
                <span className="text-zinc-950">{staff.length}</span> en nómina · <span className="text-zinc-950">{activeCount}</span> operativos
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-3 h-14 px-8 bg-zinc-900 text-white rounded-[1.25rem] font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-zinc-900/20 hover:bg-black transition-all active:scale-95"
        >
          <Plus size={18} className="text-[#D4AF37]" />
          Alta de Personal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Fuerza Total', value: staff.length, icon: Users, color: 'text-zinc-900', bg: 'bg-zinc-100' },
          { label: 'Nivel Operativo', value: activeCount, icon: CheckCircle2, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' },
          { label: 'Servicio Activo', value: activeCount, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
          {
            label: 'Credenciales Alert', value: expiringCount, icon: AlertTriangle,
            color: expiringCount > 0 ? 'text-red-500' : 'text-zinc-400', bg: expiringCount > 0 ? 'bg-red-50' : 'bg-zinc-100'
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-white border border-zinc-200 shadow-sm rounded-3xl p-6 flex items-center gap-5 group hover:border-[#D4AF37]/30 transition-all"
          >
            <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105', stat.bg)}>
              <stat.icon size={24} className={stat.color} />
            </div>
            <div>
              <p className="text-3xl font-black text-zinc-950 tracking-tighter leading-none">{stat.value}</p>
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-2">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Credential alert banner */}
      <AnimatePresence>
        {expiringCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-5 bg-red-50 border border-red-100 rounded-[2rem] px-8 py-5 shadow-xl shadow-red-900/5"
          >
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-500 shadow-sm border border-red-100 shrink-0">
               <AlertTriangle size={22} />
            </div>
            <p className="text-xs font-black text-red-900 uppercase tracking-widest leading-relaxed">
              <span className="text-red-500">{expiringCount} OPERADORES</span> CON CREDENCIALES PRÓXIMAS AL VENCIMIENTO. REQUIERE ACCIÓN INMEDIATA PARA EVITAR DESAFECTACIÓN DE SERVICIOS.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-5">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="BUSCAR POR NOMBRE, FUNCIÓN O DNI..."
            className="w-full h-14 bg-white border border-zinc-200 rounded-2xl py-3 pl-14 pr-6 text-xs font-black text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37]/50 transition-all uppercase tracking-widest"
          />
        </div>
        <div className="flex bg-white border-2 border-zinc-200 p-1.5 rounded-2xl gap-1.5 shadow-sm">
          {['Todos', 'Activos', 'Inactivos'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                filter === f ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-950'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-zinc-200 rounded-[2.5rem] h-64 animate-pulse" />
          ))}
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white border border-dashed border-zinc-200 rounded-[3rem]">
          <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
             <Users size={40} className="text-zinc-200" />
          </div>
          <p className="text-[11px] font-black text-zinc-300 uppercase tracking-[0.3em] italic">Sin registros en el radar operativo</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredStaff.map((person, i) => {
            const days = daysUntilExpiry(person.credential_expiry);
            const isExpiringSoon = days !== null && days <= 30 && days >= 0;
            const isExpired = days !== null && days < 0;
            const objectiveName = objectives.find(o => o.id === person.current_objective_id)?.name;

            return (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group bg-white border border-zinc-200 shadow-sm hover:shadow-xl hover:border-[#D4AF37]/30 rounded-[2.5rem] overflow-hidden transition-all relative flex flex-col"
              >
                {/* Expiry warning stripe */}
                {(isExpiringSoon || isExpired) && (
                  <div className={cn('h-1.5 w-full', isExpired ? 'bg-red-500' : 'bg-[#D4AF37]')} />
                )}

                <div className="p-8 flex-1">
                  <div className="flex items-start justify-between mb-8">
                    <div className="w-20 h-20 rounded-3xl bg-zinc-50 border border-zinc-100 flex items-center justify-center overflow-hidden shadow-inner group-hover:border-[#D4AF37]/50 transition-colors">
                      {person.avatar_url
                        ? <img src={person.avatar_url} alt={person.name} className="w-full h-full object-cover" />
                        : <User size={32} className="text-zinc-200 group-hover:text-[#D4AF37] transition-colors" />
                      }
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={cn(
                        'text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border',
                        person.status === 'active' || person.status === 'Activo'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : 'bg-zinc-50 text-zinc-400 border-zinc-100'
                      )}>
                        {person.status === 'active' || person.status === 'Activo' ? 'Activo' : 'Inactivo'}
                      </span>
                      {(isExpiringSoon || isExpired) && (
                        <span className={cn(
                          'text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shadow-sm',
                          isExpired ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                        )}>
                          <AlertTriangle size={10} />
                          {isExpired ? 'Vencida' : `Vence ${days}d`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-xl font-black text-zinc-900 tracking-tight group-hover:text-[#D4AF37] transition-colors truncate uppercase">
                      {person.name}
                    </h3>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-1 italic">
                      {person.role || 'Operador de Seguridad'}
                    </p>
                  </div>

                  <div className="space-y-3 pt-6 border-t border-zinc-50">
                    {person.dni && (
                      <div className="flex items-center gap-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        <ShieldCheck size={14} className="text-zinc-300" />
                        DNI {person.dni}
                      </div>
                    )}
                    {objectiveName && (
                      <div className="flex items-center gap-3 text-[10px] font-black text-zinc-900 uppercase tracking-widest">
                        <div className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
                        <span className="truncate">{objectiveName}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-8 pb-8 flex items-center justify-between gap-4 mt-auto">
                  <Link href={`/gerente/personal/${person.id}`} className="flex-1">
                    <button className="w-full h-12 bg-zinc-50 text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-zinc-900 hover:text-white transition-all shadow-sm border border-zinc-100">
                      Ver Legajo <ChevronRight size={14} />
                    </button>
                  </Link>
                  <button
                    onClick={() => handleSoftDelete(person.id, person.name)}
                    className="w-12 h-12 rounded-2xl bg-zinc-50 text-zinc-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all border border-zinc-100"
                    title="Dar de baja"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MODAL: Alta de Personal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-end md:items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.1)] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-zinc-200"
            >
              <div className="flex items-center justify-between p-8 border-b border-zinc-100 bg-zinc-50/50">
                <div>
                  <h2 className="text-2xl font-black text-zinc-900 tracking-tighter uppercase">Alta de Personal</h2>
                  <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em] mt-1.5 italic">Apertura de Legajo Digital SPS 704</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-11 h-11 rounded-2xl bg-white hover:bg-zinc-50 flex items-center justify-center transition-colors border border-zinc-100 shadow-sm">
                  <X size={20} className="text-zinc-400" />
                </button>
              </div>

              <form onSubmit={handleCreateStaff} className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                {/* Sección: Datos Personales */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                     <div className="w-6 h-6 bg-[#D4AF37]/10 rounded flex items-center justify-center">
                        <User size={14} className="text-[#D4AF37]" />
                     </div>
                     <p className="text-[11px] font-black text-zinc-900 uppercase tracking-[0.3em]">Identidad Operativa</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Nombre Completo *" required placeholder="Apellido y Nombre..." value={newStaff.name} onChange={(e: any) => setNewStaff({ ...newStaff, name: e.target.value })} />
                    <Field label="Función / Rango *" required placeholder="Guardia, Supervisor..." value={newStaff.role} onChange={(e: any) => setNewStaff({ ...newStaff, role: e.target.value })} />
                    <Field label="DNI *" required placeholder="Nº de Documento..." value={newStaff.dni} onChange={(e: any) => setNewStaff({ ...newStaff, dni: e.target.value })} />
                    <Field label="Dirección" placeholder="Domicilio completo..." value={newStaff.address} onChange={(e: any) => setNewStaff({ ...newStaff, address: e.target.value })} />
                  </div>
                </div>

                {/* Sección: Contacto y Acceso */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                     <div className="w-6 h-6 bg-blue-50 rounded flex items-center justify-center">
                        <Mail size={14} className="text-blue-500" />
                     </div>
                     <p className="text-[11px] font-black text-zinc-900 uppercase tracking-[0.3em]">Contacto y Acceso</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Gmail Corporativo *" required type="email" placeholder="correo@gmail.com" value={newStaff.email} onChange={(e: any) => setNewStaff({ ...newStaff, email: e.target.value })} />
                    <Field label="Teléfono / WhatsApp" placeholder="+54 9 11 xxxx xxxx" value={newStaff.phone} onChange={(e: any) => setNewStaff({ ...newStaff, phone: e.target.value })} />
                  </div>
                  <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 flex gap-4 items-start shadow-inner">
                    <ShieldCheck size={20} className="text-[#D4AF37] shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-zinc-500 leading-relaxed uppercase tracking-tight">
                      EL ACCESO SE CONFIGURARÁ CON LA CLAVE MAESTRA: <span className="text-zinc-900 font-black">7042026</span>. OBLIGATORIO CAMBIAR EN PRIMER ACCESO.
                    </p>
                  </div>
                </div>

                {/* Sección: Credencial de Seguridad */}
                <div className="space-y-5">
                   <div className="flex items-center gap-3">
                     <div className="w-6 h-6 bg-red-50 rounded flex items-center justify-center">
                        <ShieldCheck size={14} className="text-red-500" />
                     </div>
                     <p className="text-[11px] font-black text-zinc-900 uppercase tracking-[0.3em]">Habilitación y Nómina</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Field label="Nº de Credencial" placeholder="CRED-XXXX-XXXX" value={newStaff.credential_number} onChange={(e: any) => setNewStaff({ ...newStaff, credential_number: e.target.value })} />
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Vencimiento</label>
                      <input
                        type="date"
                        className="w-full h-12 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-black text-zinc-900 uppercase focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all"
                        value={newStaff.credential_expiry}
                        onChange={(e) => setNewStaff({ ...newStaff, credential_expiry: e.target.value })}
                      />
                    </div>
                    <Field label="Tarifa Hora ($)" type="number" step="0.01" placeholder="3500.00" value={newStaff.hourly_pay_rate} onChange={(e: any) => setNewStaff({ ...newStaff, hourly_pay_rate: e.target.value })} />
                  </div>
                </div>

                {/* Sección: Talles de Uniforme */}
                <div className="space-y-5">
                   <div className="flex items-center gap-3">
                     <div className="w-6 h-6 bg-emerald-50 rounded flex items-center justify-center">
                        <Package size={14} className="text-emerald-500" />
                     </div>
                     <p className="text-[11px] font-black text-zinc-900 uppercase tracking-[0.3em]">Indumentaria</p>
                  </div>
                  <div className="grid grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Camisa</label>
                      <select
                        className="w-full h-12 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-black text-zinc-900 focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                        value={newStaff.shirt_size}
                        onChange={(e) => setNewStaff({ ...newStaff, shirt_size: e.target.value })}
                      >
                        <option value="">— Talle —</option>
                        {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Pantalón</label>
                      <select
                        className="w-full h-12 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-black text-zinc-900 focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                        value={newStaff.pants_size}
                        onChange={(e) => setNewStaff({ ...newStaff, pants_size: e.target.value })}
                      >
                        <option value="">— Talle —</option>
                        {['38', '40', '42', '44', '46', '48', '50', '52', '54', '56'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Calzado</label>
                      <select
                        className="w-full h-12 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-black text-zinc-900 focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                        value={newStaff.boot_size}
                        onChange={(e) => setNewStaff({ ...newStaff, boot_size: e.target.value })}
                      >
                        <option value="">— Talle —</option>
                        {['38', '39', '40', '41', '42', '43', '44', '45', '46'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 h-14 bg-zinc-50 text-zinc-400 font-black uppercase text-[11px] tracking-widest rounded-2xl hover:bg-zinc-100 transition-all active:scale-95 border border-zinc-100"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 h-14 bg-zinc-900 text-white font-black uppercase text-[11px] tracking-widest rounded-2xl hover:bg-black shadow-xl shadow-zinc-900/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ShieldCheck size={18} className="text-[#D4AF37]" />}
                    Confirmar Alta
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, ...props }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">{label}</label>
      <input
        className="w-full h-12 bg-white border border-zinc-200 rounded-xl px-5 text-xs font-black text-zinc-900 placeholder:text-zinc-300 focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37]/50 outline-none transition-all uppercase tracking-tight"
        {...props}
      />
    </div>
  );
}
