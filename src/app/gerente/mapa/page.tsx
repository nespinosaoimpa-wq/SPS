'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Map as MapIcon, 
  Users, 
  Target, 
  Filter, 
  Maximize2,
  Bell,
  Radio,
  Navigation,
  ShieldAlert
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const TacticalLeaflet = dynamic(() => import('@/components/gerente/TacticalLeaflet'), { ssr: false });

export default function MapaOperativoPage() {
  const [data, setData] = useState<any>({ objectives: [], resources: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'objectives' | 'personnel'>('all');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.dashboard.getMapData();
        setData(res);
      } catch (err) {
        console.error("Error fetching map data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to real-time resource updates
    const channel = supabase
      .channel('map-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, (payload) => {
        const updatedResource = payload.new as any;
        if (payload.eventType === 'UPDATE') {
          setData((prev: any) => ({
            ...prev,
            resources: prev.resources.map((r: any) => r.id === updatedResource.id ? updatedResource : r)
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredItems = {
    objectives: data.objectives.filter((o: any) => 
      o.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    resources: data.resources.filter((r: any) => 
      r.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  };

  return (
    <div className="flex bg-black h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar: Control Panel */}
      <div className="w-80 h-full border-r border-primary/20 bg-[#050505] flex flex-col z-20">
        <div className="p-4 border-b border-primary/10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white">Centro de Comando Táctico</h2>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={14} />
            <input 
              type="text"
              placeholder="BUSCAR UNIDAD O PUNTO..."
              className="w-full bg-black/40 border border-primary/10 rounded-sm py-2 pl-9 pr-4 text-[10px] text-white placeholder:text-gray-700 focus:outline-none focus:border-primary/40 transition-all font-mono"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Filters */}
          <div className="p-4 grid grid-cols-3 gap-2 border-b border-primary/5 bg-secondary/20">
            {(['all', 'objectives', 'personnel'] as const).map((type) => (
              <button 
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  "py-2 text-[8px] font-black uppercase tracking-wider rounded-sm border transition-all",
                  filterType === type 
                    ? "bg-primary text-black border-primary" 
                    : "bg-black/40 text-gray-500 border-primary/10 hover:border-primary/30"
                )}
              >
                {type === 'all' ? 'Ver Todo' : type === 'objectives' ? 'Puntos' : 'Unidades'}
              </button>
            ))}
          </div>

          <div className="p-2 space-y-1">
            {(filterType === 'all' || filterType === 'objectives') && filteredItems.objectives.map((obj: any) => (
              <div 
                key={obj.id}
                onClick={() => setSelectedItem(obj)}
                className={cn(
                  "p-3 rounded-sm border cursor-pointer transition-all hover:bg-white/5 group",
                  selectedItem?.id === obj.id ? "bg-primary/5 border-primary/30" : "bg-transparent border-transparent"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-bold text-white uppercase group-hover:text-primary transition-colors">{obj.name}</span>
                  <div className={cn("w-1.5 h-1.5 rounded-full", obj.status === 'Activo' ? "bg-green-500" : "bg-red-500 animate-pulse")} />
                </div>
                <div className="flex justify-between items-center text-[8px] text-gray-500 uppercase font-mono">
                  <span>ID: {obj.id}</span>
                  <span className={cn(selectedItem?.id === obj.id ? "text-primary" : "")}>{obj.status}</span>
                </div>
              </div>
            ))}

            {(filterType === 'all' || filterType === 'personnel') && filteredItems.resources.map((res: any) => (
              <div 
                key={res.id}
                onClick={() => setSelectedItem(res)}
                className={cn(
                  "p-3 rounded-sm border cursor-pointer transition-all hover:bg-white/5 group",
                  selectedItem?.id === res.id ? "bg-blue-500/5 border-blue-500/30" : "bg-transparent border-transparent"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-bold text-white uppercase group-hover:text-blue-400 transition-colors">{res.name}</span>
                  <div className={cn("w-1.5 h-1.5 rounded-sm rotate-45", res.status === 'active' ? "bg-blue-500" : "bg-gray-600")} />
                </div>
                <div className="flex justify-between items-center text-[8px] text-gray-500 uppercase font-mono">
                  <span>UNIDAD MOVIL</span>
                  <span className={cn(res.status === 'active' ? "text-blue-400" : "")}>{res.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Details Panel */}
        <AnimatePresence>
          {selectedItem && (
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="mt-auto border-t border-primary/30 bg-primary/5 p-4"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[8px] text-primary uppercase font-black tracking-widest mb-1">Detalles Seleccionados</p>
                  <h3 className="text-xs font-black text-white uppercase">{selectedItem.name}</h3>
                </div>
                <button onClick={() => setSelectedItem(null)} className="text-gray-500 hover:text-white">
                  <Maximize2 size={12} className="rotate-45" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="p-2 bg-black/40 border border-primary/10 rounded-sm">
                  <p className="text-[7px] text-gray-600 uppercase mb-1">Latitud</p>
                  <p className="text-[10px] font-mono text-white">{selectedItem.latitude?.toFixed(5)}</p>
                </div>
                <div className="p-2 bg-black/40 border border-primary/10 rounded-sm">
                  <p className="text-[7px] text-gray-600 uppercase mb-1">Longitud</p>
                  <p className="text-[10px] font-mono text-white">{selectedItem.longitude?.toFixed(5)}</p>
                </div>
              </div>

              <Button variant="tactical" className="w-full text-[9px] h-8">
                ORDEN DE SERVICIO
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 relative">
        <div className="absolute inset-0 z-0">
          <TacticalLeaflet 
            objectives={data.objectives}
            resources={data.resources}
            className="w-full h-full"
            onPointSelect={(p) => setSelectedItem(p)}
          />
        </div>

        {/* HUD Elements */}
        <div className="absolute top-6 left-6 z-10 pointer-events-none space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black/80 border border-primary/20 backdrop-blur-xl flex items-center gap-3 shadow-2xl">
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">LIVE_COMMAND_ON</span>
            </div>
            <div className="p-2 bg-black/80 border border-primary/20 backdrop-blur-xl text-[10px] font-mono text-primary uppercase flex items-center gap-3">
              <Navigation size={12} /> -31.6333 / -60.7000
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2">
           <Button className="bg-black/80 border border-primary/20 backdrop-blur-md rounded-full w-10 h-10 p-0 hover:bg-primary hover:text-black transition-all">
             <Maximize2 size={16} />
           </Button>
           <Button className="bg-black/80 border border-primary/20 backdrop-blur-md rounded-full w-10 h-10 p-0 hover:bg-primary hover:text-black transition-all">
             <Bell size={16} />
           </Button>
        </div>

        {/* Radar Scanning Effect Decorative */}
        <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-10">
           <div className="absolute inset-x-0 top-0 h-[1px] bg-primary animate-radar-scan" />
        </div>
      </div>
    </div>
  );
}
