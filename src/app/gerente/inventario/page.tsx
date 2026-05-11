'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, Search, Plus, Radio, Shield, Truck, Zap, 
  LayoutGrid, List as ListIcon, AlertTriangle, Filter,
  ArrowUpRight, UserCheck, X, Check, Smartphone, Camera, Lightbulb, Activity, History
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { supabase } from '@/lib/supabase';

// Categorías configuradas según requerimiento
const assetCategories = [
  { id: 'linterna', name: 'Linternas', icon: Zap, color: 'text-amber-500', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]' },
  { id: 'celular', name: 'Celulares', icon: Smartphone, color: 'text-blue-500', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.2)]' },
  { id: 'detector_metales', name: 'Det. Metales', icon: Shield, color: 'text-purple-500', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.2)]' },
  { id: 'camara_seguridad', name: 'Cámaras', icon: Camera, color: 'text-red-500', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]' },
  { id: 'reflector', name: 'Reflectores', icon: Lightbulb, color: 'text-yellow-500', glow: 'shadow-[0_0_15px_rgba(234,179,8,0.2)]' },
  { id: 'otros', name: 'Otros', icon: Package, color: 'text-gray-400', glow: 'shadow-[0_0_15px_rgba(156,163,175,0.1)]' },
];

export default function InventarioHub() {
  const [view, setView] = useState<'grid' | 'list' | 'activity'>('list');
  const [logs, setLogs] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'linterna',
    serial_number: '',
    condition: 'operativo',
    assigned_to_objective: '',
    notes: ''
  });

  const fetchLogs = async () => {
    try {
      const { data } = await supabase
        .from('inventory_logs')
        .select('*, inventory_items(name), objectives(name)')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) setLogs(data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchInventory();
    fetchObjectives();
    fetchLogs();
  }, []);

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*, objectives(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchObjectives = async () => {
    try {
      const { data } = await supabase.from('objectives').select('id, name');
      if (data) setObjectives(data);
    } catch (e) {}
  };

  const handleCreate = async () => {
    if (!newItem.name) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('inventory_items').insert([{
        ...newItem,
        assigned_to_objective: newItem.assigned_to_objective || null
      }]);
      if (error) throw error;
      setIsSheetOpen(false);
      setNewItem({ name: '', category: 'linterna', serial_number: '', condition: 'operativo', assigned_to_objective: '', notes: '' });
      await fetchInventory();
    } catch (e) {
      console.error("Error creating item:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    (item.serial_number && item.serial_number.toLowerCase().includes(search.toLowerCase())) ||
    (item.objectives?.name && item.objectives.name.toLowerCase().includes(search.toLowerCase()))
  );

  const getCategoryCount = (catId: string) => items.filter(i => i.category === catId).length;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Page Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">Inventario Operativo</h1>
          <p className="text-xs text-primary uppercase font-display tracking-[0.3em] mt-2 italic">Control Patrimonial y Asignación por Objetivo</p>
        </div>
        <div className="flex gap-3">
          <Button variant="tactical" size="sm" className="gap-2" onClick={() => setIsSheetOpen(true)}>
            <Plus size={14} /> NUEVO ELEMENTO
          </Button>
        </div>
      </div>

      {/* Category Overview */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {assetCategories.map((cat, i) => (
          <Card key={i} className={cn("bg-secondary/40 border-white/5 hover:border-primary/30 transition-all cursor-pointer group relative overflow-hidden", cat.glow)}>
            <CardContent className="p-4 text-center">
              <div className={cn("p-3 rounded-lg bg-black/40 border border-white/5 mx-auto w-fit mb-3", cat.color)}>
                <cat.icon size={24} />
              </div>
              <h3 className="text-2xl font-black text-white leading-none">{getCategoryCount(cat.id)}</h3>
              <p className="text-[9px] uppercase text-gray-500 tracking-widest mt-1 font-display truncate">{cat.name}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Assets Command Bar */}
      <div className="flex justify-between items-center gap-4 bg-zinc-950/50 p-4 border border-white/5 rounded-sm">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input 
              placeholder="BUSCAR ELEMENTO O NÚMERO DE SERIE..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 text-[10px] uppercase h-10 bg-black/40 border-white/10 text-white"
            />
          </div>
        </div>
      </div>

      {/* Asset List Content */}
      <Card className="border-primary/10 bg-black/40 overflow-hidden">
        <CardContent className="p-0">
          {view === 'activity' ? (
        <div className="space-y-4">
          {logs.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-[2rem] border border-dashed border-white/10">
              <Activity className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Sin actividad registrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {logs.map((log, i) => (
                <Card key={log.id} className="bg-zinc-900/50 border-white/5 overflow-hidden">
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-primary uppercase tracking-tighter">
                          {log.inventory_items?.name || 'Item'}
                        </span>
                        <span className="text-white/20">•</span>
                        <span className="text-[10px] font-medium text-white/40">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-white font-medium mt-0.5">
                        {log.notes || 'Actualización de estado'}
                      </p>
                    </div>
                    <div className="text-right">
                       <span className="text-[8px] font-black uppercase px-2 py-1 bg-white/5 rounded text-white/60">
                         {log.new_condition || 'OK'}
                       </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : loading ? (
            <div className="p-12 text-center text-gray-500 text-xs uppercase animate-pulse">Cargando inventario...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-xs uppercase">No se encontraron elementos.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-black/80 border-b border-white/10">
                  <th className="p-4 text-[9px] text-gray-500 uppercase font-black pl-8 tracking-widest">Elemento</th>
                  <th className="p-4 text-[9px] text-gray-500 uppercase font-black tracking-widest">Nº Serie</th>
                  <th className="p-4 text-[9px] text-gray-500 uppercase font-black tracking-widest">Asignado a (Objetivo)</th>
                  <th className="p-4 text-[9px] text-gray-500 uppercase font-black tracking-widest text-right pr-8">Condición</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((asset, i) => {
                  const cat = assetCategories.find(c => c.id === asset.category) || assetCategories[5];
                  return (
                    <motion.tr 
                      key={asset.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b border-white/5 hover:bg-white/5 transition-all group cursor-pointer"
                    >
                      <td className="p-4 pl-8">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border border-white/10", cat.color, cat.glow)}>
                            <cat.icon size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white uppercase group-hover:text-primary transition-colors">{asset.name}</p>
                            <p className="text-[8px] text-gray-500 font-mono italic">{cat.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-[10px] text-gray-400 font-mono tracking-tight">{asset.serial_number || 'S/N'}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                           {asset.assigned_to_objective ? (
                             <>
                              <Shield size={12} className="text-primary" />
                              <span className="text-xs font-medium uppercase text-gray-200">
                                {asset.objectives?.name || 'Objetivo desconocido'}
                              </span>
                             </>
                           ) : (
                             <span className="text-xs font-medium uppercase text-gray-600 italic">En Depósito Central</span>
                           )}
                        </div>
                      </td>
                      <td className="p-4 text-right pr-8">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 border rounded-md",
                          asset.condition === 'operativo' ? "border-green-500/30 text-green-500 bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.1)]" :
                          asset.condition === 'roto' ? "border-red-500/30 text-red-500 bg-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.1)] animate-pulse" :
                          asset.condition === 'faltante' ? "border-orange-500/30 text-orange-500 bg-orange-500/10 shadow-[0_0_10px_rgba(249,115,22,0.1)]" :
                          "border-gray-500/30 text-gray-500 bg-gray-500/10"
                        )}>
                          {asset.condition}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* New Asset BottomSheet */}
      <BottomSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} title="Alta de Elemento">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black tracking-widest text-gray-400">Nombre / Modelo *</label>
            <Input 
              value={newItem.name} 
              onChange={e => setNewItem({...newItem, name: e.target.value})}
              placeholder="Ej. Linterna Maglite ML300L"
              className="bg-black/50 border-white/10 text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black tracking-widest text-gray-400">Categoría *</label>
            <select 
              value={newItem.category}
              onChange={e => setNewItem({...newItem, category: e.target.value})}
              className="w-full h-10 bg-black/50 border border-white/10 rounded-md px-3 text-white text-xs uppercase"
            >
              {assetCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black tracking-widest text-gray-400">Número de Serie</label>
            <Input 
              value={newItem.serial_number} 
              onChange={e => setNewItem({...newItem, serial_number: e.target.value})}
              placeholder="SN-XXXXX"
              className="bg-black/50 border-white/10 text-white font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black tracking-widest text-gray-400">Asignado a Objetivo</label>
            <select 
              value={newItem.assigned_to_objective}
              onChange={e => setNewItem({...newItem, assigned_to_objective: e.target.value})}
              className="w-full h-10 bg-black/50 border border-white/10 rounded-md px-3 text-white text-xs uppercase"
            >
              <option value="">[ EN DEPÓSITO CENTRAL ]</option>
              {objectives.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black tracking-widest text-gray-400">Condición Inicial</label>
            <select 
              value={newItem.condition}
              onChange={e => setNewItem({...newItem, condition: e.target.value})}
              className="w-full h-10 bg-black/50 border border-white/10 rounded-md px-3 text-white text-xs uppercase"
            >
              <option value="operativo">Operativo</option>
              <option value="mantenimiento">Mantenimiento</option>
              <option value="roto">Roto</option>
            </select>
          </div>
          <Button 
            className="w-full mt-6 bg-primary text-black font-black uppercase" 
            onClick={handleCreate}
            disabled={!newItem.name || loading}
          >
            {loading ? 'Guardando...' : 'Registrar Elemento'}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
