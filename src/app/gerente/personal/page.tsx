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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#D4AF37] rounded-xl flex items-center justify-center shadow-lg shadow-[#D4AF37]/30">
              <Users size={22} className="text-black" />
            </div>
            <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Gestión de Personal</h1>
            {isConfigured && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-widest">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                En Vivo
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-zinc-400 mt-2 ml-14">
            {staff.length} operadores registrados · {activeCount} activos
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 h-12 px-7 bg-zinc-900 text-white rounded-2xl font-bold text-sm shadow-lg hover:bg-zinc-800 transition-colors"
        >
          <Plus size={18} />
          Alta de Personal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Fuerza Total', value: staff.length, icon: Users, color: 'text-zinc-700', bg: 'bg-zinc-100' },
          { label: 'Operativos Activos', value: activeCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'En Servicio', value: activeCount, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
          {
            label: 'Credenciales por Vencer', value: expiringCount, icon: AlertTriangle,
            color: expiringCount > 0 ? 'text-amber-600' : 'text-zinc-400', bg: expiringCount > 0 ? 'bg-amber-50' : 'bg-zinc-100'
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-5 flex items-center gap-4"
          >
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', stat.bg)}>
              <stat.icon size={20} className={stat.color} />
            </div>
            <div>
              <p className="text-2xl font-black text-zinc-900">{stat.value}</p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{stat.label}</p>
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
            className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4"
          >
            <AlertTriangle size={20} className="text-amber-500 shrink-0" />
            <p className="text-sm font-bold text-amber-800">
              <strong>{expiringCount} operador{expiringCount > 1 ? 'es' : ''}</strong> con credencial de seguridad próxima a vencer (30 días). Accioná antes del vencimiento para evitar interrupciones operativas.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, función o DNI..."
            className="w-full bg-white border border-zinc-200 rounded-2xl py-3 pl-12 pr-5 text-sm font-semibold text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37]/50 transition-all"
          />
        </div>
        <div className="flex bg-white border border-zinc-200 p-1 rounded-2xl gap-1">
          {['Todos', 'Activos', 'Inactivos'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
                filter === f ? 'bg-zinc-900 text-white shadow' : 'text-zinc-500 hover:text-zinc-800'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-zinc-200 rounded-3xl h-48 animate-pulse" />
          ))}
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white border border-dashed border-zinc-200 rounded-3xl">
          <Users size={48} className="text-zinc-300 mb-4" />
          <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Sin resultados para estos filtros</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                className="group bg-white border border-zinc-200 shadow-sm hover:shadow-md rounded-3xl overflow-hidden transition-all relative"
              >
                {/* Expiry warning stripe */}
                {(isExpiringSoon || isExpired) && (
                  <div className={cn('h-1 w-full', isExpired ? 'bg-red-500' : 'bg-amber-400')} />
                )}

                <div className="p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden">
                      {person.avatar_url
                        ? <img src={person.avatar_url} alt={person.name} className="w-full h-full object-cover" />
                        : <User size={28} className="text-zinc-400" />
                      }
                    </div>
                    <div className="flex items-center gap-2">
                      {(isExpiringSoon || isExpired) && (
                        <span className={cn(
                          'text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border',
                          isExpired ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                        )}>
                          {isExpired ? 'Credencial Vencida' : `Vence en ${days}d`}
                        </span>
                      )}
                      <span className={cn(
                        'text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg',
                        person.status === 'active' || person.status === 'Activo'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-zinc-100 text-zinc-500'
                      )}>
                        {person.status === 'active' || person.status === 'Activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>

                  <div className="mb-5">
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight group-hover:text-[#D4AF37] transition-colors truncate">
                      {person.name}
                    </h3>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mt-0.5">
                      {person.role || 'Guardia de Seguridad'}
                    </p>
                  </div>

                  <div className="space-y-1.5 border-t border-zinc-100 pt-4">
                    {person.dni && (
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <ShieldCheck size={12} className="text-zinc-400" />
                        <span className="font-semibold">DNI {person.dni}</span>
                      </div>
                    )}
                    {objectiveName && (
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="font-semibold truncate">{objectiveName}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-5 pt-4 border-t border-zinc-100">
                    <Link href={`/gerente/personal/${person.id}`}>
                      <button className="flex items-center gap-1.5 text-xs font-black text-zinc-500 uppercase tracking-widest hover:text-[#D4AF37] transition-colors">
                        Ver Legajo <ChevronRight size={14} />
                      </button>
                    </Link>
                    <button
                      onClick={() => handleSoftDelete(person.id, person.name)}
                      className="w-8 h-8 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all"
                      title="Dar de baja"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
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
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-zinc-200">
                <div>
                  <h2 className="text-xl font-black text-zinc-900">Alta de Personal</h2>
                  <p className="text-xs text-zinc-400 font-semibold uppercase tracking-widest mt-0.5">Legajo Digital Completo</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition-colors">
                  <X size={18} className="text-zinc-600" />
                </button>
              </div>

              <form onSubmit={handleCreateStaff} className="p-6 space-y-6">
                {/* Sección: Datos Personales */}
                <div>
                  <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em] mb-3">Datos Personales</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Nombre Completo *" required placeholder="Apellido y Nombre..." value={newStaff.name} onChange={(e: any) => setNewStaff({ ...newStaff, name: e.target.value })} />
                    <Field label="Función / Rango *" required placeholder="Guardia, Supervisor..." value={newStaff.role} onChange={(e: any) => setNewStaff({ ...newStaff, role: e.target.value })} />
                    <Field label="DNI *" required placeholder="Nº de Documento..." value={newStaff.dni} onChange={(e: any) => setNewStaff({ ...newStaff, dni: e.target.value })} />
                    <Field label="Dirección" placeholder="Domicilio completo..." value={newStaff.address} onChange={(e: any) => setNewStaff({ ...newStaff, address: e.target.value })} />
                  </div>
                </div>

                {/* Sección: Contacto y Acceso */}
                <div>
                  <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em] mb-3">Contacto y Acceso al Sistema</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Gmail de Acceso *" required type="email" placeholder="correo@gmail.com" value={newStaff.email} onChange={(e: any) => setNewStaff({ ...newStaff, email: e.target.value })} />
                    <Field label="Teléfono / WhatsApp" placeholder="+54 9 11 xxxx xxxx" value={newStaff.phone} onChange={(e: any) => setNewStaff({ ...newStaff, phone: e.target.value })} />
                  </div>
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-blue-700">
                      ⚠️ El acceso se habilitará con la clave predeterminada: <strong>7042026</strong>. El operador deberá cambiarla en su primer ingreso.
                    </p>
                  </div>
                </div>

                {/* Sección: Credencial de Seguridad */}
                <div>
                  <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em] mb-3">Credencial de Seguridad Privada</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="Número de Credencial" placeholder="CRED-XXXX-XXXX" value={newStaff.credential_number} onChange={(e: any) => setNewStaff({ ...newStaff, credential_number: e.target.value })} />
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider ml-1">Fecha de Vencimiento</label>
                      <input
                        type="date"
                        className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 text-sm font-semibold text-zinc-800 focus:ring-2 focus:ring-[#D4AF37]/30 outline-none transition-all"
                        value={newStaff.credential_expiry}
                        onChange={(e) => setNewStaff({ ...newStaff, credential_expiry: e.target.value })}
                      />
                    </div>
                    <Field label="Tarifa/Hora (Nómina $)" type="number" step="0.01" placeholder="3500.00" value={newStaff.hourly_pay_rate} onChange={(e: any) => setNewStaff({ ...newStaff, hourly_pay_rate: e.target.value })} />
                  </div>
                </div>

                {/* Sección: Talles de Uniforme */}
                <div>
                  <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em] mb-3">Talles de Uniforme</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider ml-1">Camisa / Remera</label>
                      <select
                        className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 text-sm font-semibold text-zinc-800 focus:ring-2 focus:ring-[#D4AF37]/30 outline-none"
                        value={newStaff.shirt_size}
                        onChange={(e) => setNewStaff({ ...newStaff, shirt_size: e.target.value })}
                      >
                        <option value="">— Seleccionar —</option>
                        {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider ml-1">Pantalón</label>
                      <select
                        className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 text-sm font-semibold text-zinc-800 focus:ring-2 focus:ring-[#D4AF37]/30 outline-none"
                        value={newStaff.pants_size}
                        onChange={(e) => setNewStaff({ ...newStaff, pants_size: e.target.value })}
                      >
                        <option value="">— Seleccionar —</option>
                        {['38', '40', '42', '44', '46', '48', '50', '52', '54', '56'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider ml-1">Calzado (nro.)</label>
                      <select
                        className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 text-sm font-semibold text-zinc-800 focus:ring-2 focus:ring-[#D4AF37]/30 outline-none"
                        value={newStaff.boot_size}
                        onChange={(e) => setNewStaff({ ...newStaff, boot_size: e.target.value })}
                      >
                        <option value="">— Seleccionar —</option>
                        {['38', '39', '40', '41', '42', '43', '44', '45', '46'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 h-12 bg-zinc-100 text-zinc-600 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-zinc-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 h-12 bg-zinc-900 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : 'Confirmar Alta'}
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
