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
  ShieldAlert,
  Plus,
  MapPin,
  X
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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

  // New Objective State
  const [isAddingPoint, setIsAddingPoint] = useState(false);
  const [lastClickedCoords, setLastClickedCoords] = useState<{lat: number, lng: number} | null>(null);
  const [newObjective, setNewObjective] = useState({
    name: '',
    address: '',
    client_name: '',
    contact_phone: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.dashboard.getMapData();
      setData(res);
    } catch (err) {
      console.error("Error fetching map data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to real-time resource updates
    const channel = supabase
      .channel('map-realtime-v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, (payload) => {
        const updatedResource = payload.new as any;
        if (payload.eventType === 'UPDATE') {
          setData((prev: any) => ({
            ...prev,
            resources: (prev.resources || []).map((r: any) => r.id === updatedResource.id ? updatedResource : r)
          }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'objectives' }, () => {
        fetchData(); 
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastClickedCoords) return;

    try {
      await api.objectives.create({
        ...newObjective,
        id: `OBJ-${Math.floor(Math.random() * 900) + 100}`,
        latitude: lastClickedCoords.lat,
        longitude: lastClickedCoords.lng,
        status: 'Activo'
      });
      
      setIsAddingPoint(false);
      setLastClickedCoords(null);
      setNewObjective({ name: '', address: '', client_name: '', contact_phone: '' });
      fetchData();
    } catch (err) {
      alert("Error al guardar el punto táctico: " + (err as any).message);
    }
  };

  const filteredItems = {
    objectives: (data.objectives || []).filter((o: any) => 
      o.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    resources: (data.resources || []).filter((r: any) => 
      r.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  };

  return (
    <div className="flex bg-black h-[calc(100vh-4rem)] overflow-hidden relative font-sans">
      
      {/* Sidebar: Control Panel */}
      <div className="w-80 h-full border-r border-white/5 bg-[#050505] flex flex-col z-20 shadow-2xl">
        <div className="p-6 border-b border-white/5 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(255,215,0,0.5)]"></div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Tactical Node Center</h2>
          </div>
          
          <Button 
             variant={isAddingPoint ? "ghost" : "vanguard"} 
             className={cn(
               "w-full h-12 text-[10px] font-black uppercase tracking-widest transition-all",
               isAddingPoint ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20" : "shadow-lg shadow-primary/5"
             )}
             onClick={() => {
               setIsAddingPoint(!isAddingPoint);
               setLastClickedCoords(null);
               setSelectedItem(null);
             }}
           >
             {isAddingPoint ? (
               <><X size={14} className="mr-2" /> Cancelar Selección</>
             ) : (
               <><Plus size={14} className="mr-2" /> Nuevo Punto Táctico</>
             )}
           </Button>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-primary transition-colors" size={14} />
            <input 
              type="text"
              placeholder="BUSCAR UNIDAD O NODO..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-[11px] text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary/40 transition-all font-mono"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Filters */}
          <div className="p-4 grid grid-cols-3 gap-2 border-b border-white/5 bg-white/[0.02]">
            {(['all', 'objectives', 'personnel'] as const).map((type) => (
              <button 
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  "py-2 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all",
                  filterType === type 
                    ? "bg-primary text-black border-primary shadow-lg shadow-primary/10" 
                    : "bg-transparent text-zinc-600 border-white/5 hover:border-white/20 hover:text-zinc-300"
                )}
              >
                {type === 'all' ? 'Ver Todo' : type === 'objectives' ? 'Nodos' : 'Móviles'}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-2">
            {(filterType === 'all' || filterType === 'objectives') && filteredItems.objectives.map((obj: any) => (
              <div 
                key={obj.id}
                onClick={() => setSelectedItem(obj)}
                className={cn(
                  "p-4 rounded-2xl border cursor-pointer transition-all hover:bg-white/5 group",
                  selectedItem?.id === obj.id ? "bg-primary/5 border-primary/30" : "bg-transparent border-transparent"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[11px] font-black text-white uppercase group-hover:text-primary transition-colors tracking-tight">{obj.name}</span>
                  <div className={cn("w-2 h-2 rounded-full", (obj.status === 'Activo' || obj.status === 'active') ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-red-500 animate-pulse")} />
                </div>
                <div className="flex justify-between items-center text-[9px] text-zinc-600 uppercase font-mono tracking-tighter">
                  <span>ID: {obj.id}</span>
                  <span className={cn(selectedItem?.id === obj.id ? "text-primary italic" : "")}>{obj.status}</span>
                </div>
              </div>
            ))}

            {(filterType === 'all' || filterType === 'personnel') && filteredItems.resources.map((res: any) => (
              <div 
                key={res.id}
                onClick={() => setSelectedItem(res)}
                className={cn(
                  "p-4 rounded-2xl border cursor-pointer transition-all hover:bg-white/5 group",
                  selectedItem?.id === res.id ? "bg-blue-500/5 border-blue-500/30" : "bg-transparent border-transparent"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[11px] font-black text-white uppercase group-hover:text-blue-400 transition-colors tracking-tight">{res.name}</span>
                  <div className={cn("w-2 h-2 rounded-sm rotate-45", res.status === 'active' ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" : "bg-zinc-700")} />
                </div>
                <div className="flex justify-between items-center text-[9px] text-zinc-600 uppercase font-mono tracking-tighter">
                  <span>UNIDAD OPERATIVA</span>
                  <span className={cn(res.status === 'active' ? "text-blue-400 italic" : "")}>{res.status}</span>
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
              className="mt-auto border-t border-primary/20 bg-primary/[0.02] p-6 backdrop-blur-xl"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[9px] text-primary uppercase font-black tracking-[0.2em] mb-1 italic">NODO_LIVE_FEED</p>
                  <h3 className="text-sm font-black text-white uppercase">{selectedItem.name}</h3>
                </div>
                <button onClick={() => setSelectedItem(null)} className="text-zinc-600 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                  <p className="text-[8px] text-zinc-600 uppercase font-black mb-1">Latitud</p>
                  <p className="text-[11px] font-mono text-white tracking-tighter">{selectedItem.latitude?.toFixed(6)}</p>
                </div>
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                  <p className="text-[8px] text-zinc-600 uppercase font-black mb-1">Longitud</p>
                  <p className="text-[11px] font-mono text-white tracking-tighter">{selectedItem.longitude?.toFixed(6)}</p>
                </div>
              </div>

              <Button variant="vanguard" className="w-full text-[10px] h-12 font-black uppercase tracking-widest shadow-xl">
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
            onMapClick={(coords) => {
               if (isAddingPoint) setLastClickedCoords(coords);
            }}
            isPickerMode={isAddingPoint}
            draftCoords={lastClickedCoords}
          />
        </div>

        {/* HUD Elements */}
        <div className="absolute top-8 left-8 z-10 pointer-events-none space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-black/80 border border-white/10 backdrop-blur-2xl flex items-center gap-3 shadow-2xl rounded-2xl">
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.6)]"></div>
              <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">LIVE_COMMAND</span>
            </div>
            <div className="p-3 bg-black/80 border border-white/10 backdrop-blur-2xl text-[10px] font-mono text-primary uppercase flex items-center gap-4 rounded-2xl shadow-2xl">
              <Navigation size={14} /> 
              <span>{lastClickedCoords ? `${lastClickedCoords.lat.toFixed(5)} / ${lastClickedCoords.lng.toFixed(5)}` : "-31.6333 / -60.7000"}</span>
            </div>
          </div>
          
          <AnimatePresence>
            {isAddingPoint && !lastClickedCoords && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-primary px-6 py-3 rounded-2xl text-black text-[10px] font-black uppercase flex items-center gap-3 shadow-[0_10px_40px_rgba(255,215,0,0.3)] border-2 border-white/20 animate-bounce"
              >
                <MapPin size={16} /> HAGA CLIC EN EL MAPA PARA MARCAR POSICIÓN
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="absolute bottom-8 right-8 z-10 flex flex-col gap-3">
           <Button className="bg-black/60 border border-white/10 backdrop-blur-xl rounded-2xl w-12 h-12 p-0 hover:bg-primary hover:text-black hover:border-primary transition-all shadow-2xl group">
             <Maximize2 size={18} className="group-hover:scale-110 transition-transform" />
           </Button>
           <Button className="bg-black/60 border border-white/10 backdrop-blur-xl rounded-2xl w-12 h-12 p-0 hover:bg-primary hover:text-black hover:border-primary transition-all shadow-2xl group">
             <Bell size={18} className="group-hover:scale-110 transition-transform" />
           </Button>
        </div>
      </div>

       {/* Floating Capture Form */}
       <AnimatePresence>
         {lastClickedCoords && (
           <motion.div 
             initial={{ opacity: 0, scale: 0.9, x: '-50%', y: 30 }}
             animate={{ opacity: 1, scale: 1, x: '-50%', y: 0 }}
             exit={{ opacity: 0, scale: 0.9, x: '-50%', y: 30 }}
             className="absolute bottom-12 left-1/2 z-[30] w-[500px] bg-[#0A0A0A]/95 backdrop-blur-3xl p-10 rounded-[3rem] border border-primary/30 shadow-[0_30px_100px_rgba(0,0,0,0.9)]"
           >
             <div className="flex justify-between items-center mb-8">
               <div className="flex items-center gap-4">
                 <div className="w-3 h-3 rounded-full bg-primary animate-pulse shadow-[0_0_15px_rgba(255,215,0,0.5)]" />
                 <h2 className="text-lg font-black text-white uppercase tracking-tighter">Nodo <span className="text-primary italic">Operativo</span></h2>
               </div>
               <button 
                 onClick={() => setLastClickedCoords(null)} 
                 className="p-2 bg-white/5 hover:bg-red-500/20 text-zinc-500 hover:text-red-500 rounded-full transition-all"
               >
                 <X size={20} />
               </button>
             </div>

             <form onSubmit={handleAddObjective} className="space-y-6">
               <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Identificador</label>
                   <Input 
                     required
                     placeholder="EJ: BASE_CENTRAL"
                     value={newObjective.name}
                     className="h-12 text-[11px] bg-white/5 border-white/10 rounded-xl focus:border-primary/50"
                     onChange={e => setNewObjective({...newObjective, name: e.target.value.toUpperCase()})}
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Razón Social</label>
                   <Input 
                     required
                     placeholder="EJ: CLIENTE_ALFA"
                     value={newObjective.client_name}
                     className="h-12 text-[11px] bg-white/5 border-white/10 rounded-xl focus:border-primary/50"
                     onChange={e => setNewObjective({...newObjective, client_name: e.target.value.toUpperCase()})}
                   />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Dirección del Objetivo</label>
                 <Input 
                   required
                   placeholder="EJ: CALLE_PRINCIPAL_123"
                   value={newObjective.address}
                   className="h-12 text-[11px] bg-white/5 border-white/10 rounded-xl focus:border-primary/50"
                   onChange={e => setNewObjective({...newObjective, address: e.target.value.toUpperCase()})}
                 />
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Contacto de Emergencia</label>
                 <Input 
                   placeholder="EJ: +54 9 342 555-0100"
                   value={newObjective.contact_phone}
                   className="h-12 text-[11px] bg-white/5 border-white/10 rounded-xl focus:border-primary/50"
                   onChange={e => setNewObjective({...newObjective, contact_phone: e.target.value})}
                 />
               </div>

               <div className="flex gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl font-mono text-[10px] text-primary shadow-inner">
                 <MapPin size={16} />
                 <div className="flex flex-col">
                    <span className="font-black opacity-60">LOCALIZACIÓN CAPTURADA</span>
                    <span className="tracking-tighter">{lastClickedCoords.lat.toFixed(7)}, {lastClickedCoords.lng.toFixed(7)}</span>
                 </div>
               </div>

               <Button type="submit" variant="vanguard" className="w-full h-14 text-xs font-black uppercase tracking-widest shadow-[0_15px_40px_rgba(255,215,0,0.15)] rounded-2xl">
                 CREAR NODO OPERATIVO
               </Button>
             </form>
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
}
