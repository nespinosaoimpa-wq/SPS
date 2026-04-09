'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  Search, 
  Plus, 
  Radio, 
  Shield, 
  Truck, 
  Zap, 
  LayoutGrid, 
  List as ListIcon, 
  AlertTriangle, 
  Filter,
  ArrowUpRight,
  UserCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

const assetCategories = [
  { id: 'arm', name: 'Armamento', icon: Shield, count: 42, color: 'text-red-500', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]' },
  { id: 'rad', name: 'Comunicaciones', icon: Radio, count: 128, color: 'text-blue-500', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.2)]' },
  { id: 'veh', name: 'Flota Vehicular', icon: Truck, count: 12, color: 'text-primary', glow: 'shadow-[0_0_15px_rgba(255,215,0,0.2)]' },
  { id: 'ind', name: 'Indumentaria', icon: Package, count: 450, color: 'text-gray-400', glow: 'shadow-[0_0_15px_rgba(156,163,175,0.1)]' },
];

const mockAssets = [
  { id: 'AST-101', name: 'Glock 17 Gen 5', category: 'Armamento', status: 'Asignado', holder: 'Op. Méndez', health: 95 },
  { id: 'AST-102', name: 'Motorola DP4400e', category: 'Radio', status: 'En Stock', holder: '-', health: 80 },
  { id: 'AST-103', name: 'Hilux 4x4 - Int 02', category: 'Vehículo', status: 'Mantenimiento', holder: 'Logística', health: 45 },
  { id: 'AST-104', name: 'Glock 17 Gen 5', category: 'Armamento', status: 'Asignado', holder: 'Op. Ruiz', health: 100 },
  { id: 'AST-105', name: 'Baofeng UV-5R', category: 'Radio', status: 'Alerta', holder: 'Op. Silva', health: 15 },
];

export default function InventarioHub() {
  const [view, setView] = useState<'grid' | 'list'>('list');

  return (
    <div className="space-y-6 pb-12">
      
      {/* Page Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">Inventario de Activos</h1>
          <p className="text-xs text-primary uppercase font-display tracking-[0.3em] mt-2 italic">Control Patrimonial y Gestión de Equipamiento Crítico</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="gap-2 border-primary/20 text-gray-400">
             HISTORIAL DE ALTAS
          </Button>
          <Button variant="tactical" size="sm" className="gap-2">
            <Plus size={14} /> CARGAR NUEVO ACTIVO
          </Button>
        </div>
      </div>

      {/* Category Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {assetCategories.map((cat, i) => (
          <Card key={i} className={cn("bg-secondary/40 border-white/5 hover:border-primary/30 transition-all cursor-pointer group relative overflow-hidden", cat.glow)}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={cn("p-2 rounded-sm bg-black/40 border border-white/5", cat.color)}>
                  <cat.icon size={20} />
                </div>
                <ArrowUpRight size={14} className="text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="text-2xl font-black text-white leading-none">{cat.count}</h3>
              <p className="text-[10px] uppercase text-gray-500 tracking-widest mt-1 font-display">{cat.name}</p>
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
              placeholder="BUSCAR POR ID, MODELO O ASIGNACIÓN..." 
              className="pl-10 text-[10px] uppercase h-10 bg-black/40 border-white/10"
            />
          </div>
          <div className="flex bg-black/40 rounded-sm p-1 border border-white/5">
            <button 
              onClick={() => setView('grid')}
              className={cn("p-1.5 rounded-xs transition-all", view === 'grid' ? "bg-primary text-black" : "text-gray-500 hover:text-white")}
            >
              <LayoutGrid size={14} />
            </button>
            <button 
              onClick={() => setView('list')}
              className={cn("p-1.5 rounded-xs transition-all", view === 'list' ? "bg-primary text-black" : "text-gray-500 hover:text-white")}
            >
              <ListIcon size={14} />
            </button>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="ghost" size="sm" className="text-[9px] uppercase tracking-widest text-gray-400"><Filter size={14} className="mr-2" /> Filtros</Button>
           <Button variant="ghost" size="sm" className="text-[9px] uppercase tracking-widest text-gray-400"><Zap size={14} className="mr-2 text-primary" /> Mantenimiento</Button>
        </div>
      </div>

      {/* Asset List Content */}
      <Card className="border-primary/10 bg-black/40 overflow-hidden">
        <CardContent className="p-0">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/80 border-b border-white/10">
                <th className="p-4 text-[9px] text-gray-500 uppercase font-black pl-8 tracking-widest">ID / Descripción</th>
                <th className="p-4 text-[9px] text-gray-500 uppercase font-black tracking-widest">Categoría</th>
                <th className="p-4 text-[9px] text-gray-500 uppercase font-black tracking-widest">Asignado a</th>
                <th className="p-4 text-[9px] text-gray-500 uppercase font-black tracking-widest text-center">Salud Activo</th>
                <th className="p-4 text-[9px] text-gray-500 uppercase font-black tracking-widest text-right pr-8">Estado</th>
              </tr>
            </thead>
            <tbody>
              {mockAssets.map((asset, i) => (
                <motion.tr 
                  key={asset.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-all group cursor-pointer"
                >
                  <td className="p-4 pl-8">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-zinc-800 border border-white/10 flex items-center justify-center text-[10px] font-mono text-gray-400">
                        {asset.id.split('-')[1]}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white uppercase group-hover:text-primary transition-colors">{asset.name}</p>
                        <p className="text-[8px] text-gray-500 font-mono italic">REF_{asset.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                     <span className="text-[10px] text-gray-400 uppercase tracking-tight">{asset.category}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                       {asset.holder !== '-' ? <UserCheck size={12} className="text-primary" /> : null}
                       <span className={cn("text-xs font-medium uppercase", asset.holder === '-' ? "text-gray-600 italic" : "text-gray-200")}>
                          {asset.holder}
                       </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${asset.health}%` }}
                          className={cn(
                            "h-full",
                            asset.health > 70 ? "bg-green-500" :
                            asset.health > 40 ? "bg-amber-500" : "bg-red-500"
                          )}
                        />
                      </div>
                      <span className="text-[8px] font-mono text-gray-600 uppercase tracking-tighter">{asset.health}% Optimal</span>
                    </div>
                  </td>
                  <td className="p-4 text-right pr-8">
                    <div className="flex items-center justify-end gap-2 text-right">
                       {asset.status === 'Mantenimiento' && <AlertTriangle size={12} className="text-red-500 animate-pulse" />}
                       <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest px-2 py-1 border rounded-xs",
                        asset.status === 'Asignado' ? "border-primary/20 text-primary bg-primary/5 shadow-[0_0_8px_rgba(255,215,0,0.1)]" :
                        asset.status === 'En Stock' ? "border-green-500/20 text-green-500 bg-green-500/5 shadow-[0_0_8px_rgba(34,197,94,0.1)]" :
                        asset.status === 'Mantenimiento' ? "border-red-500/20 text-red-500 bg-red-500/5 shadow-[0_0_8px_rgba(239,68,68,0.1)]" :
                        "border-white/10 text-gray-500"
                      )}>
                        {asset.status}
                      </span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Inventory Health HUD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-primary/5 border-primary/20 p-6">
          <div className="flex justify-between items-center mb-4">
             <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white">Disponibilidad de Armamento</h4>
             <span className="text-[10px] text-primary font-bold">92%</span>
          </div>
          <div className="flex gap-1 h-3">
             {[...Array(20)].map((_, i) => (
               <div key={i} className={cn("flex-1 rounded-xs transition-all", i < 18 ? "bg-primary shadow-[0_0_5px_rgba(255,215,0,0.4)]" : "bg-white/10")} />
             ))}
          </div>
          <p className="text-[9px] text-gray-500 mt-4 uppercase italic">Última auditoría balística: Hace 4 días por Auditoría Central</p>
        </Card>

        <Card className="bg-zinc-950/50 border-white/5 p-6">
          <div className="flex justify-between items-center mb-4">
             <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white">Estado Flota de Comunicación</h4>
             <span className="text-[10px] text-blue-500 font-bold">78% Activa</span>
          </div>
          <div className="grid grid-cols-10 gap-1">
             {[...Array(40)].map((_, i) => (
               <div key={i} className={cn("h-1 rounded-sm", i < 30 ? "bg-blue-500" : "bg-white/5")} />
             ))}
          </div>
          <p className="text-[9px] text-gray-600 mt-4 uppercase">12 Unidades en reparación por fallas de señal en zona norte</p>
        </Card>
      </div>

    </div>
  );
}
