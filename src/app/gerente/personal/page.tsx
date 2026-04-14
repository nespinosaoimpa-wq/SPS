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

export default function PersonalPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('Todos');
  
  const [newStaff, setNewStaff] = useState({
    id: '', name: '', role: '', phone: '', email: '', dni: '', status: 'active'
  });

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await api.staff.list();
      setStaff(data);
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
      await api.staff.create(newStaff);
      setIsModalOpen(false);
      setNewStaff({ id: '', name: '', role: '', phone: '', email: '', dni: '', status: 'active' });
      fetchStaff();
    } catch (err) {
      alert("Error al crear: " + (err as any).message);
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
          <h1 className="text-2xl font-bold text-gray-900">Personal</h1>
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
                  <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <User size={18} className="text-gray-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{person.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{person.role || 'Sin cargo asignado'}</p>
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
        <form onSubmit={handleCreateStaff} className="space-y-4 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">Nombre Completo</label>
              <Input required placeholder="Juan Pérez" value={newStaff.name}
                onChange={e => setNewStaff({...newStaff, name: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">Legajo / ID</label>
              <Input required placeholder="S-710" value={newStaff.id}
                onChange={e => setNewStaff({...newStaff, id: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">Cargo</label>
              <Input required placeholder="Vigilador" value={newStaff.role}
                onChange={e => setNewStaff({...newStaff, role: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">DNI</label>
              <Input required placeholder="30.123.456" value={newStaff.dni}
                onChange={e => setNewStaff({...newStaff, dni: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">Teléfono</label>
              <Input placeholder="+54 342 555-0123" value={newStaff.phone}
                onChange={e => setNewStaff({...newStaff, phone: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">Email</label>
              <Input type="email" placeholder="nombre@sps.com" value={newStaff.email}
                onChange={e => setNewStaff({...newStaff, email: e.target.value})} />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" className="flex-1 h-11">
              Registrar
            </Button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}
