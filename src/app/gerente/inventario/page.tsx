'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Search, Plus, Shield, Zap, 
  AlertTriangle, Filter, Smartphone, Camera, Lightbulb, 
  Activity, MoreVertical, Trash2, Edit3, MapPin, 
  CheckCircle2, Clock, Box
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { supabase } from '@/lib/supabase';

// Categorías configuradas según requerimiento
const assetCategories = [
  { id: 'linterna', name: 'Linternas', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 'radio', name: 'Radios', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'chaleco', name: 'Chalecos', icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { id: 'celular', name: 'Celulares', icon: Smartphone, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'detector_metales', name: 'Det. Metales', icon: Shield, color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: 'camara_seguridad', name: 'Cámaras', icon: Camera, color: 'text-red-500', bg: 'bg-red-50' },
  { id: 'reflector', name: 'Reflectores', icon: Lightbulb, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { id: 'otros', name: 'Otros', icon: Package, color: 'text-zinc-400', bg: 'bg-zinc-50' },
];

export default function InventarioHub() {
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({
    item_name: '',
    category: 'linterna',
    serial_number: '',
    status: 'operativo',
    objective_id: '',
    notes: ''
  });

  useEffect(() => {
    fetchInventory();
    fetchObjectives();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('resource_inventory')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      if (data && data.length > 0) {
        const objectiveIds = [...new Set(data.map((i: any) => i.objective_id).filter(Boolean))];
        if (objectiveIds.length > 0) {
          const { data: objData } = await supabase.from('objectives').select('id, name').in('id', objectiveIds);
          const objMap = Object.fromEntries(objData?.map(o => [o.id, o.name]) || []);
          const itemsWithObj = data.map((i: any) => ({ 
            ...i, 
            objectives: i.objective_id ? { name: objMap[i.objective_id] || 'Desconocido' } : null 
          }));
          setItems(itemsWithObj);
        } else {
          setItems(data);
        }
      } else {
        setItems([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchObjectives = async () => {
    try {
      const { data } = await supabase.from('objectives').select('id, name').eq('is_active', true);
      if (data) setObjectives(data);
    } catch (e) {}
  };

  const handleCreate = async () => {
    if (!newItem.item_name) return; // ✅ Fixed: was incorrectly checking newItem.name
    try {
      setLoading(true);
      const { error } = await supabase.from('resource_inventory').insert([{
        ...newItem,
        objective_id: newItem.objective_id || null
      }]);
      if (error) throw error;
      setIsSheetOpen(false);
      setNewItem({ item_name: '', category: 'linterna', serial_number: '', status: 'operativo', objective_id: '', notes: '' });
      await fetchInventory();
    } catch (e) {
      console.error('Error creating item:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}" del inventario? Esta acción no se puede deshacer.`)) return;
    try {
      const { error } = await supabase.from('resource_inventory').delete().eq('id', id);
      if (error) throw error;
      fetchInventory();
    } catch (e) {
      console.error('Error deleting item:', e);
    }
  };

  const handleAssignObjective = async (itemId: string, objId: string) => {
    try {
      const { error } = await supabase.from('resource_inventory').update({ objective_id: objId || null }).eq('id', itemId);
      if (error) throw error;
      fetchInventory();
    } catch (e) {
      console.error('Error assigning objective:', e);
    }
  };

  const updateItemStatus = async (id: string, newCondition: string) => {
    try {
      const { error } = await supabase
        .from('resource_inventory')
        .update({ status: newCondition, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      fetchInventory();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.item_name.toLowerCase().includes(search.toLowerCase()) || 
                          (item.serial_number && item.serial_number.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, search, categoryFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: items.length,
    operativo: items.filter(i => i.status === 'operativo').length,
    problemas: items.filter(i => i.status === 'roto' || i.status === 'mantenimiento').length,
    asignados: items.filter(i => i.objective_id).length
  }), [items]);

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-[1600px] mx-auto min-h-screen">
      
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-zinc-900 border border-zinc-100">
               <Box size={24} />
            </div>
            <h1 className="text-3xl font-black text-zinc-900 tracking-tighter uppercase">Control de Stock</h1>
          </div>
          <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest ml-16">
            Logística operativa y gestión patrimonial de activos
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button 
            variant="primary" 
            className="flex-1 md:flex-none h-14 px-8 rounded-2xl shadow-xl shadow-primary/20 group"
            onClick={() => setIsSheetOpen(true)}
          >
            <Plus size={18} className="mr-2 group-hover:rotate-90 transition-transform" />
            NUEVO ELEMENTO
          </Button>
        </div>
      </div>

      {/* Hero Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Activos', value: stats.total, icon: Package, color: 'text-zinc-900', bg: 'bg-white' },
          { label: 'En Operación', value: stats.operativo, icon: CheckCircle2, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/5' },
          { label: 'Con Reportes', value: stats.problemas, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Asignados', value: stats.asignados, icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className={cn("border border-zinc-200 shadow-sm hover:shadow-md transition-all overflow-hidden h-32 flex items-center rounded-2xl", stat.bg)}>
              <CardContent className="p-6 flex items-center gap-5 w-full">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", stat.bg === 'bg-white' ? 'bg-zinc-50' : 'bg-white/50')}>
                  <stat.icon size={28} className={stat.color} />
                </div>
                <div>
                  <p className="text-3xl font-black text-zinc-900 leading-none mb-1">{stat.value}</p>
                  <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Control Bar */}
      <Card className="border border-zinc-200 shadow-sm p-4 bg-white/80 backdrop-blur-md sticky top-6 z-10 rounded-3xl">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
            <input 
              placeholder="Buscar por nombre, modelo o número de serie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-14 pl-12 pr-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-700 placeholder:text-zinc-300 focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-hide">
            <select 
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="h-14 px-6 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-black uppercase text-zinc-500 focus:ring-2 focus:ring-[#D4AF37]/20 cursor-pointer"
            >
              <option value="all">TODAS LAS CATEGORÍAS</option>
              {assetCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-14 px-6 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-black uppercase text-zinc-500 focus:ring-2 focus:ring-[#D4AF37]/20 cursor-pointer"
            >
              <option value="all">TODOS LOS ESTADOS</option>
              <option value="operativo">OPERATIVO</option>
              <option value="mantenimiento">EN REPARACIÓN</option>
              <option value="roto">FUERA DE SERVICIO</option>
              <option value="faltante">EXTRAVIADO</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Grid/List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="col-span-full py-20 text-center">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-black text-gray-300 uppercase tracking-widest">Sincronizando inventario...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="col-span-full py-32 text-center bg-zinc-50 rounded-[3rem] border border-dashed border-zinc-200">
               <Package size={64} className="text-zinc-200 mx-auto mb-4" />
               <p className="text-lg font-black text-zinc-400 uppercase">Sin resultados</p>
               <p className="text-sm text-zinc-300 mt-1 uppercase font-medium tracking-tight">No se encontraron elementos con los filtros actuales</p>
            </div>
          ) : (
            filteredItems.map((item, i) => {
              const cat = assetCategories.find(c => c.id === item.category) || assetCategories[5];
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="border-none shadow-sm hover:shadow-xl transition-all group bg-white rounded-[2rem] overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner", cat.bg, cat.color)}>
                          <cat.icon size={24} />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                            item.status === 'operativo' ? "bg-green-50 text-green-600" : 
                            item.status === 'roto' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                          )}>
                            {item.status}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 mb-6">
                        <h3 className="text-lg font-black text-zinc-900 uppercase leading-none truncate group-hover:text-[#D4AF37] transition-colors">
                          {item.item_name}
                        </h3>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic">{cat.name}</p>
                      </div>

                      <div className="bg-zinc-50 rounded-2xl p-4 space-y-3 mb-6 border border-zinc-100">
                        <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-tight">
                          <span className="text-zinc-400">Nº de Serie:</span>
                          <span className="text-zinc-900 font-mono">{item.serial_number || 'S/N'}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-tight">
                          <span className="text-zinc-400">Ubicación:</span>
                          <span className={cn("flex items-center gap-1", item.objective_id ? "text-blue-600" : "text-amber-600")}>
                            {item.objective_id ? <Shield size={12} /> : <Box size={12} />}
                            {item.objectives?.name || 'DEPÓSITO CENTRAL'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 h-9 rounded-xl text-[9px] font-black uppercase border-gray-100"
                            onClick={() => updateItemStatus(item.id, item.status === 'operativo' ? 'roto' : 'operativo')}
                          >
                            <Activity size={12} className="mr-1.5" />
                            {item.status === 'operativo' ? 'Reportar Falla' : 'Restaurar'}
                          </Button>
                          <Button variant="ghost" size="sm" className="w-9 h-9 p-0 rounded-xl text-gray-300 hover:text-red-500" onClick={() => handleDelete(item.id, item.item_name)}>
                            <Trash2 size={15} />
                          </Button>
                        </div>
                        <select
                          className="w-full h-9 rounded-xl bg-gray-50 border border-gray-100 text-[9px] font-bold uppercase text-gray-600 px-3 cursor-pointer"
                          value={item.objective_id || ''}
                          onChange={(e) => handleAssignObjective(item.id, e.target.value)}
                        >
                          <option value="">[ DEPÓSITO CENTRAL ]</option>
                          {objectives.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* New Asset BottomSheet */}
      <BottomSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} title="Alta de Activo Operativo">
        <div className="space-y-6 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-1">Nombre / Modelo *</label>
              <Input 
                value={newItem.item_name} 
                onChange={e => setNewItem({...newItem, item_name: e.target.value})}
                placeholder="Ej. Linterna Maglite ML300L"
                className="h-14 rounded-2xl bg-gray-50 border-none shadow-inner"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-1">Categoría del Equipo *</label>
              <select 
                value={newItem.category}
                onChange={e => setNewItem({...newItem, category: e.target.value})}
                className="w-full h-14 bg-gray-50 border-none rounded-2xl px-4 text-xs font-bold uppercase text-gray-700 focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                {assetCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-1">Nº de Serie / Identificador</label>
              <Input 
                value={newItem.serial_number} 
                onChange={e => setNewItem({...newItem, serial_number: e.target.value})}
                placeholder="SN-XXXXX"
                className="h-14 rounded-2xl bg-gray-50 border-none shadow-inner font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-1">Objetivo de Asignación</label>
              <select 
                value={newItem.objective_id}
                onChange={e => setNewItem({...newItem, objective_id: e.target.value})}
                className="w-full h-14 bg-gray-50 border-none rounded-2xl px-4 text-xs font-bold uppercase text-gray-700 focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value="">[ DEPÓSITO CENTRAL ]</option>
                {objectives.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-1">Condición Inicial</label>
            <div className="grid grid-cols-3 gap-2">
              {['operativo', 'mantenimiento', 'roto'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewItem({...newItem, status: c})}
                  className={cn(
                    "h-12 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all",
                    newItem.status === c ? "bg-gray-900 text-white shadow-lg" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-3xl flex gap-4 border border-blue-100">
             <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Box size={20} />
             </div>
             <p className="text-[11px] text-blue-800 font-medium leading-relaxed">
               Este activo será registrado en el sistema central y aparecerá disponible para los reportes de entrega de puesto en el objetivo seleccionado.
             </p>
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              className="flex-1 h-14 rounded-2xl bg-primary text-black font-black uppercase shadow-xl shadow-primary/20" 
              onClick={handleCreate}
              disabled={!newItem.item_name || loading}
            >
              {loading ? 'Sincronizando...' : 'Registrar Activo'}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
