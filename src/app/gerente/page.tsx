'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  MapPin, 
  Users, 
  Plus, 
  X, 
  ChevronRight,
  Clock,
  Phone,
  Building2,
  User
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { api } from '@/lib/api';
import { supabase, isConfigured } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function AdminDashboard() {
  const [data, setData] = useState<any>({ objectives: [], resources: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedObjective, setSelectedObjective] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // New Objective
  const [isAddingPoint, setIsAddingPoint] = useState(false);
  const [lastClickedCoords, setLastClickedCoords] = useState<{lat: number, lng: number} | null>(null);
  const [newObjective, setNewObjective] = useState({
    name: '', address: '', client_name: '', contact_phone: ''
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.dashboard.getMapData();
      setData(res);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (isMobile) setIsSidebarOpen(false);

    const channel = supabase
      .channel('map-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'objectives' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isMobile]);

  const handleAddObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastClickedCoords) return;
    try {
      // Remove manual id to let Supabase handle UUID generation
      const { ...objectiveData } = newObjective;
      
      await api.objectives.create({
        ...objectiveData,
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

  const filteredObjectives = (data.objectives || []).filter((o: any) =>
    o.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeGuards = (data.resources || []).filter((r: any) => r.status === 'active' || r.status === 'activo');

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden relative -mx-0 -mt-0">
      
      {/* ====== SIDEBAR: Lista de Objetivos ====== */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className={cn(
              "h-full bg-white border-r border-gray-200 flex flex-col z-[40] shadow-lg",
              isMobile ? "absolute inset-0 w-full" : "relative w-[340px] shrink-0"
            )}
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-100 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Objetivos</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={cn("w-2 h-2 rounded-full animate-pulse", isConfigured ? "bg-green-500" : "bg-amber-500")} />
                    <p className="text-[10px] text-gray-400 font-medium">{isConfigured ? 'MODO REAL' : 'MODO PROTEGIDO'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={isAddingPoint ? "danger" : "primary"}
                    onClick={() => {
                      setIsAddingPoint(!isAddingPoint);
                      setLastClickedCoords(null);
                      if (isMobile) setIsSidebarOpen(false);
                    }}
                  >
                    {isAddingPoint ? <><X size={14} /> Cancelar</> : <><Plus size={14} /> Nuevo</>}
                  </Button>
                  {isMobile && (
                    <Button size="sm" variant="ghost" onClick={() => setIsSidebarOpen(false)}>
                      <X size={18} />
                    </Button>
                  )}
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar objetivo..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Objective List */}
            <div className="flex-1 overflow-y-auto">
              {filteredObjectives.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <MapPin size={32} className="mb-3 text-gray-300" />
                  <p className="text-sm font-medium">Sin resultados</p>
                </div>
              ) : (
                <div className="p-3 space-y-1">
                  {filteredObjectives.map((obj: any) => (
                    <button
                      key={obj.id}
                      onClick={() => {
                        setSelectedObjective(obj);
                        if (isMobile) setIsSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full text-left p-4 rounded-xl transition-all",
                        selectedObjective?.id === obj.id
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-gray-50 border border-transparent"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                          obj.status === 'Activo' ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-400"
                        )}>
                          <MapPin size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">{obj.name}</h3>
                          {obj.address && <p className="text-xs text-gray-500 mt-0.5 truncate">{obj.address}</p>}
                          <div className="flex items-center gap-2 mt-2">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              obj.status === 'Activo' ? "bg-green-500" : "bg-gray-400"
                            )} />
                            <span className="text-[10px] text-gray-400 font-medium">{obj.status}</span>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-300 mt-1" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Stats Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <div className="flex justify-around">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{filteredObjectives.length}</p>
                  <p className="text-[10px] text-gray-400 font-medium">Objetivos</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">{activeGuards.length}</p>
                  <p className="text-[10px] text-gray-400 font-medium">En servicio</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== MAP AREA ====== */}
      <div className="flex-1 relative flex flex-col">

        {/* Mobile: Floating controls */}
        {isMobile && !isSidebarOpen && (
          <div className="absolute top-4 left-4 z-[45] flex gap-2">
            <button 
              className="bg-white p-3 rounded-xl shadow-md border border-gray-200"
              onClick={() => setIsSidebarOpen(true)}
            >
              <MapPin size={20} className="text-gray-700" />
            </button>
            <button
              className={cn(
                "px-4 py-3 rounded-xl shadow-md border flex items-center gap-2 text-xs font-semibold",
                isAddingPoint 
                  ? "bg-red-50 border-red-200 text-red-600" 
                  : "bg-primary border-primary text-black"
              )}
              onClick={() => setIsAddingPoint(!isAddingPoint)}
            >
              {isAddingPoint ? <X size={16} /> : <Plus size={16} />}
              {isAddingPoint ? "Cancelar" : "Nuevo"}
            </button>
          </div>
        )}

        {/* Picker mode instruction */}
        {isAddingPoint && !lastClickedCoords && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[45] pointer-events-none">
            <div className="bg-blue-500 text-white px-5 py-2.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-2 animate-bounce">
              <MapPin size={14} />
              Tocá el mapa para marcar la ubicación
            </div>
          </div>
        )}

        {/* The Map */}
        <div className="flex-1 relative z-0">
          {/* Main Map Search (Floating) */}
          <div className="absolute top-6 left-6 z-20 w-80 max-w-[calc(100vw-48px)]">
            <Card className="p-1 px-3 flex items-center gap-2 shadow-2xl border-none bg-white/95 backdrop-blur">
              <div className="text-primary">
                <Search size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Buscar dirección en el mapa..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 font-medium"
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const query = (e.target as HTMLInputElement).value;
                    if (!query) return;
                    try {
                      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
                      const results = await res.json();
                      if (results && results.length > 0) {
                        const { lat, lon } = results[0];
                        setLastClickedCoords({ lat: parseFloat(lat), lng: parseFloat(lon) });
                      }
                    } catch (err) {
                      console.error("Geocoding error:", err);
                    }
                  }
                }}
              />
              <div className="h-4 w-px bg-gray-200 mx-1" />
              <button 
                onClick={() => setIsAddingPoint(true)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                title="Nuevo Nodo de Seguridad"
              >
                <Plus size={18} />
              </button>
            </Card>
          </div>

          <MapView
            objectives={data.objectives}
            guards={data.resources}
            incidents={data.recentIncidents}
            className="w-full h-full"
            onObjectiveSelect={(obj) => setSelectedObjective(obj)}
            onMapClick={(coords) => {
              if (isAddingPoint) setLastClickedCoords(coords);
            }}
            isPickerMode={isAddingPoint}
            draftCoords={lastClickedCoords}
            selectedObjectiveId={selectedObjective?.id}
          />
        </div>

        {/* ====== SELECTED OBJECTIVE PANEL ====== */}
        <AnimatePresence>
          {selectedObjective && !isAddingPoint && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={cn(
                "z-[50] bg-white border-t border-gray-200 shadow-xl",
                isMobile
                  ? "fixed inset-x-0 bottom-0 rounded-t-3xl p-5 pb-24 max-h-[60vh] overflow-y-auto"
                  : "absolute bottom-6 left-6 right-6 rounded-2xl p-6 max-w-lg mx-auto"
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <MapPin size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{selectedObjective.name}</h3>
                    {selectedObjective.address && (
                      <p className="text-xs text-gray-500 mt-0.5">{selectedObjective.address}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedObjective(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>

              {/* Info chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedObjective.client_name && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg">
                    <Building2 size={12} className="text-gray-500" />
                    <span className="text-xs font-medium text-gray-600">{selectedObjective.client_name}</span>
                  </div>
                )}
                {selectedObjective.contact_phone && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg">
                    <Phone size={12} className="text-gray-500" />
                    <span className="text-xs font-medium text-gray-600">{selectedObjective.contact_phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-xs font-medium text-green-700">{selectedObjective.status}</span>
                </div>
              </div>

              {/* Guard on duty (placeholder) */}
              <div className="p-3 bg-gray-50 rounded-xl mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
                    <User size={16} className="text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400">Guardia en servicio</p>
                    <p className="text-sm font-semibold text-gray-700">Sin información de turno</p>
                  </div>
                  <Clock size={14} className="text-gray-400" />
                </div>
              </div>

              {/* Action Button */}
              <Link href={`/gerente/objetivos/${selectedObjective.id}`}>
                <Button variant="default" className="w-full h-11">
                  Ver Detalle Completo
                  <ChevronRight size={16} />
                </Button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ====== NEW OBJECTIVE FORM ====== */}
        <AnimatePresence>
          {lastClickedCoords && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={cn(
                "z-[50] bg-white border-t border-gray-200 shadow-xl",
                isMobile
                  ? "fixed inset-x-0 bottom-0 rounded-t-3xl p-5 pb-24 max-h-[80vh] overflow-y-auto"
                  : "absolute bottom-6 left-1/2 -translate-x-1/2 w-[480px] rounded-2xl p-6"
              )}
            >
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Nuevo Objetivo</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Completá los datos del lugar</p>
                </div>
                <button onClick={() => setLastClickedCoords(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleAddObjective} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">Nombre</label>
                    <Input required placeholder="Ej: Edificio Central" value={newObjective.name}
                      onChange={e => setNewObjective({...newObjective, name: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">Cliente</label>
                    <Input required placeholder="Ej: Banco Galicia" value={newObjective.client_name}
                      onChange={e => setNewObjective({...newObjective, client_name: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">Dirección</label>
                  <div className="flex gap-2">
                    <Input 
                      required 
                      placeholder="Ej: San Martín 1500, Santa Fe" 
                      className="flex-1"
                      value={newObjective.address}
                      onChange={e => setNewObjective({...newObjective, address: e.target.value})} 
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="shrink-0 h-10 px-3"
                      onClick={async () => {
                        if (!newObjective.address) return;
                        try {
                          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newObjective.address)}`);
                          const results = await res.json();
                          if (results && results.length > 0) {
                            const { lat, lon } = results[0];
                            setLastClickedCoords({ lat: parseFloat(lat), lng: parseFloat(lon) });
                          } else {
                            alert("No se encontró la dirección. Intenta ser más específico.");
                          }
                        } catch (err) {
                          console.error("Geocoding error:", err);
                        }
                      }}
                    >
                      <Search size={16} />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">Teléfono de contacto</label>
                  <Input placeholder="Ej: 342 555-0123" value={newObjective.contact_phone}
                    onChange={e => setNewObjective({...newObjective, contact_phone: e.target.value})} />
                </div>

                {/* Coords indicator */}
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                  <MapPin size={16} className="text-blue-500" />
                  <div>
                    <p className="text-xs font-medium text-blue-700">Ubicación seleccionada</p>
                    <p className="text-[11px] text-blue-500">{lastClickedCoords.lat.toFixed(6)}, {lastClickedCoords.lng.toFixed(6)}</p>
                  </div>
                </div>

                <Button type="submit" variant="primary" className="w-full h-12">
                  Guardar Objetivo
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
