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
  X,
  Menu,
  ChevronLeft
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query'; // Presumiendo que existe o lo simularemos

const TacticalLeaflet = dynamic(() => import('@/components/gerente/TacticalLeaflet'), { ssr: false });

export default function MapaOperativoPage() {
  const [data, setData] = useState<any>({ objectives: [], resources: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'objectives' | 'personnel'>('all');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Responsive check
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

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
    if (isMobile) setIsSidebarOpen(false);

    const channel = supabase
      .channel('map-realtime-v4')
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
  }, [isMobile]);

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
    } catch (err: any) {
      alert(err.message);
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
      
      {/* Dynamic Sidebar */}
      <motion.div 
        initial={false}
        animate={{ width: isSidebarOpen ? (isMobile ? '100%' : '320px') : '0px' }}
        className={cn(
          "h-full border-r border-white/5 bg-[#050505] flex flex-col z-[40] shadow-2xl overflow-hidden relative",
          isMobile && isSidebarOpen ? "absolute inset-0" : "relative"
        )}
      >
        <div className="p-6 border-b border-white/5 space-y-6 min-w-[320px]">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(255,215,0,0.5)]"></div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Tactical Control</h2>
            </div>
            {isMobile && (
              <Button variant="ghost" className="p-2" onClick={() => setIsSidebarOpen(false)}>
                <ChevronLeft size={18} />
              </Button>
            )}
          </div>
          
          <Button 
             variant={isAddingPoint ? "ghost" : "vanguard"} 
             className={cn(
               "w-full h-12 text-[10px] font-black uppercase tracking-widest transition-all",
               isAddingPoint ? "bg-red-500/10 text-red-500 border-red-500/20" : ""
             )}
             onClick={() => {
               setIsAddingPoint(!isAddingPoint);
               setLastClickedCoords(null);
               if (isMobile) setIsSidebarOpen(false);
             }}
           >
             {isAddingPoint ? <><X size={14} className="mr-2" /> CANCELAR</> : <><Plus size={14} className="mr-2" /> NUEVO PUNTO</>}
           </Button>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
            <input 
              type="text"
              placeholder="BUSCAR..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-[11px] text-white focus:outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar min-w-[320px]">
          <div className="p-4 grid grid-cols-3 gap-2 bg-white/[0.02]">
            {(['all', 'objectives', 'personnel'] as const).map((type) => (
              <button 
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  "py-2 text-[8px] font-black uppercase rounded-lg border transition-all",
                  filterType === type ? "bg-primary text-black border-primary" : "text-zinc-600 border-white/5"
                )}
              >
                {type === 'all' ? 'Todo' : type === 'objectives' ? 'Nodos' : 'Móviles'}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-2">
            {(filterType === 'all' || filterType === 'objectives') && filteredItems.objectives.map((obj: any) => (
              <div 
                key={obj.id}
                onClick={() => {
                  setSelectedItem(obj);
                  if (isMobile) setIsSidebarOpen(false);
                }}
                className={cn(
                  "p-4 rounded-xl border cursor-pointer transition-all",
                  selectedItem?.id === obj.id ? "bg-primary/5 border-primary/30" : "border-transparent"
                )}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-white uppercase">{obj.name}</span>
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Main Map Area */}
      <div className="flex-1 relative flex flex-col">
        {/* Mobile Header Overlay */}
        {isMobile && !isSidebarOpen && (
          <div className="absolute top-4 left-4 z-[45] flex gap-2">
            <Button className="bg-black/80 backdrop-blur-md p-3 rounded-xl border border-white/10" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={20} />
            </Button>
            <Button 
              className={cn(
                "bg-black/80 backdrop-blur-md px-4 py-3 rounded-xl border flex items-center gap-2 text-[10px] font-black uppercase",
                isAddingPoint ? "border-red-500 text-red-500" : "border-primary text-primary"
              )}
              onClick={() => setIsAddingPoint(!isAddingPoint)}
            >
              {isAddingPoint ? <X size={16} /> : <Plus size={16} />}
              {isAddingPoint ? "Cancelar" : "Nuevo"}
            </Button>
          </div>
        )}

        <div className="flex-1 relative z-0">
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

        {/* HUD - Conditional on Desktop */}
        {!isMobile && (
          <div className="absolute top-8 left-8 z-10 pointer-events-none space-y-4">
            <div className="p-3 bg-black/80 border border-white/10 backdrop-blur-2xl text-[10px] font-mono text-primary uppercase flex items-center gap-4 rounded-2xl">
              <Navigation size={14} /> 
              <span>{lastClickedCoords ? `${lastClickedCoords.lat.toFixed(5)} / ${lastClickedCoords.lng.toFixed(5)}` : "-31.6333 / -60.7000"}</span>
            </div>
            
            <AnimatePresence>
              {isAddingPoint && !lastClickedCoords && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-primary px-6 py-3 rounded-2xl text-black text-[10px] font-black uppercase flex items-center gap-3 animate-bounce"
                >
                  <MapPin size={16} /> HAGA CLIC EN EL MAPA PARA MARCAR POSICIÓN
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Mobile Capture Instruction Overlay */}
        {isMobile && isAddingPoint && !lastClickedCoords && (
           <div className="absolute top-20 left-4 right-4 z-[45] pointer-events-none">
              <div className="bg-primary p-4 rounded-2xl text-black text-[10px] font-black uppercase text-center flex items-center justify-center gap-3">
                 <MapPin size={16} /> TOCA EL MAPA PARA MARCAR EL PUNTO
              </div>
           </div>
        )}

        {/* Drawer / Floating Capture Form */}
        <AnimatePresence>
          {lastClickedCoords && (
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className={cn(
                "z-[50] bg-[#0A0A0A]/95 backdrop-blur-3xl border-t border-primary/30 shadow-2xl overflow-y-auto",
                isMobile 
                  ? "fixed inset-x-0 bottom-0 h-[85vh] rounded-t-[2.5rem] p-6 pb-20" 
                  : "absolute bottom-8 left-1/2 -translate-x-1/2 w-[550px] rounded-[3rem] p-10 max-h-[80vh]"
              )}
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                  <h2 className="text-lg font-black text-white uppercase tracking-tighter">Captura de <span className="text-primary italic">Nodo</span></h2>
                </div>
                <button onClick={() => setLastClickedCoords(null)} className="p-3 bg-white/5 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddObjective} className="space-y-5">
                <div className={isMobile ? "space-y-5" : "grid grid-cols-2 gap-5"}>
                  <div className="space-y-1.5 ">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Identificador</label>
                    <Input required placeholder="NOMBRE..." value={newObjective.name} className="h-12 bg-white/5 border-white/10" 
                      onChange={e => setNewObjective({...newObjective, name: e.target.value.toUpperCase()})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Cliente</label>
                    <Input required placeholder="RAZÓN SOCIAL..." value={newObjective.client_name} className="h-12 bg-white/5 border-white/10"
                      onChange={e => setNewObjective({...newObjective, client_name: e.target.value.toUpperCase()})} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Dirección</label>
                  <Input required placeholder="CALLE Y ALTURA..." value={newObjective.address} className="h-12 bg-white/5 border-white/10"
                    onChange={e => setNewObjective({...newObjective, address: e.target.value.toUpperCase()})} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Contacto</label>
                  <Input placeholder="TELÉFONO..." value={newObjective.contact_phone} className="h-12 bg-white/5 border-white/10"
                    onChange={e => setNewObjective({...newObjective, contact_phone: e.target.value})} />
                </div>

                <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-center gap-3">
                  <MapPin size={18} className="text-primary" />
                  <div className="font-mono text-[10px] text-primary">
                    <p className="font-black">COORDENADAS REGISTRADAS</p>
                    <p>{lastClickedCoords.lat.toFixed(6)}, {lastClickedCoords.lng.toFixed(6)}</p>
                  </div>
                </div>

                <Button type="submit" variant="vanguard" className="w-full h-14 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl">
                  CREAR NODO OPERATIVO
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
