'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Search, 
  MapPin, 
  Bell,
  Shield,
  Layers,
  Zap,
  X,
  Plus
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { supabase, isConfigured } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { 
  geocodeForward, 
  searchAddresses, 
  searchBoxRetrieve, 
  GeocodingResult 
} from '@/lib/geocoding';

// Optimized Components (Extracted for better performance)
import { ObjectiveSidebar } from './_components/ObjectiveSidebar';
import { LiveActivityFeed } from './_components/LiveActivityFeed';
import { ObjectiveDetailPanel, NewObjectiveForm } from './_components/ObjectivePanels';

const MapView = dynamic(() => import('@/components/MapView'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-400 font-black uppercase tracking-widest text-[10px]">Cargando Mapa Táctico...</div>
});

export default function AdminDashboard() {
  const [data, setData] = useState<any>({ objectives: [], resources: [], recentIncidents: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedObjective, setSelectedObjective] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);

  // Status/Notifications
  const [liveFeed, setLiveFeed] = useState<any[]>([]);
  const [newIncidentNotification, setNewIncidentNotification] = useState<any>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // New Objective State
  const [isAddingPoint, setIsAddingPoint] = useState(false);
  const [lastClickedCoords, setLastClickedCoords] = useState<{lat: number, lng: number} | null>(null);
  const [newObjective, setNewObjective] = useState({
    name: '', address: '', client_name: '', contact_phone: ''
  });
  const [addressSuggestions, setAddressSuggestions] = useState<GeocodingResult[]>([]);
  const [mapboxSuggestions, setMapboxSuggestions] = useState<GeocodingResult[]>([]);
  const [isSearchingMapbox, setIsSearchingMapbox] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  // --- MEMOIZED DATA (Optimization) ---
  const filteredObjectives = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return (data.objectives || []).filter((o: any) =>
      o.name?.toLowerCase().includes(query) ||
      o.address?.toLowerCase().includes(query) ||
      o.client_name?.toLowerCase().includes(query)
    );
  }, [data.objectives, searchQuery]);

  const activeGuards = useMemo(() => 
    (data.resources || []).filter((r: any) => r.status === 'active' || r.status === 'activo'),
  [data.resources]);

  // --- HANDLERS ---
  const fetchData = useCallback(async () => {
    try {
      const res = await api.dashboard.getMapData();
      setData(res);
    } catch (err) {
      console.error("Error fetching map data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMapboxSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setMapboxSuggestions([]);
      return;
    }
    setIsSearchingMapbox(true);
    try {
      const results = await searchAddresses(query);
      setMapboxSuggestions(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingMapbox(false);
    }
  };

  const handleSelectMapboxResult = async (result: any) => {
    if (result.mapbox_id) {
      const details = await searchBoxRetrieve(result.mapbox_id);
      if (details) {
        setMapCenter([details.lat, details.lng]);
        setSearchQuery(details.displayName);
      }
    } else if (result.lat && result.lng) {
      setMapCenter([result.lat, result.lng]);
      setSearchQuery(result.displayName);
    }
    setMapboxSuggestions([]);
  };

  const handleDeleteObjective = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar el objetivo "${name}"?`)) return;
    try {
      await api.objectives.delete(id);
      setSelectedObjective(null);
      fetchData();
    } catch (err) {
      alert("Error al eliminar: " + (err as any).message);
    }
  };

  const handleAddObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastClickedCoords) return;
    try {
      await api.objectives.create({
        ...newObjective,
        latitude: lastClickedCoords.lat,
        longitude: lastClickedCoords.lng,
        status: 'Activo'
      });
      setMapCenter([lastClickedCoords.lat, lastClickedCoords.lng]);
      setIsAddingPoint(false);
      setLastClickedCoords(null);
      setNewObjective({ name: '', address: '', client_name: '', contact_phone: '' });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- EFFECTS ---
  useEffect(() => {
    const checkMobile = () => {
      const isTouch = window.matchMedia("(pointer: coarse)").matches;
      const isSmall = window.innerWidth < 1024;
      setIsMobile(isTouch || isSmall);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchData();
    if (isMobile) setIsSidebarOpen(false);

    const channel = supabase
      .channel('map-realtime-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tracking_logs' }, (payload) => {
        setLiveFeed(prev => [{ ...payload.new, type: 'gps' }, ...prev].slice(0, 15));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guard_book_entries' }, (payload) => {
        const entry = payload.new as any;
        setLiveFeed(prev => [{ ...entry, type: 'event' }, ...prev].slice(0, 15));
        if (entry.entry_type === 'incidente' || entry.content.includes('ALERTA')) {
           setNewIncidentNotification(entry);
           setTimeout(() => setNewIncidentNotification(null), 8000);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as any;
          setData((prev: any) => {
            // Only update the specific resource in the array (ultra fast, no network requests)
            const resources = prev.resources?.map((r: any) => 
               r.id === updated.id ? { ...r, ...updated } : r
            );
            return { ...prev, resources };
          });
        } else {
          // If INSERT or DELETE, we fetch everything to ensure consistency
          fetchData();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'objectives' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isMobile, fetchData]);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden relative">
      
      <ObjectiveSidebar 
        isSidebarOpen={isSidebarOpen}
        isMobile={isMobile}
        isConfigured={isConfigured}
        isAddingPoint={isAddingPoint}
        setIsAddingPoint={setIsAddingPoint}
        setLastClickedCoords={setLastClickedCoords}
        setIsSidebarOpen={setIsSidebarOpen}
        searchQuery={searchQuery}
        handleMapboxSearch={handleMapboxSearch}
        filteredObjectives={filteredObjectives}
        selectedObjective={selectedObjective}
        setSelectedObjective={setSelectedObjective}
        activeGuards={activeGuards}
        onGuardSelect={(guard) => {
          setMapCenter([guard.latitude, guard.longitude]);
          if (isMobile) setIsSidebarOpen(false);
        }}
      />

      {/* ====== MAP AREA ====== */}
      <div className="flex-1 relative flex flex-col">

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
          <div className={cn(
            "absolute z-[45] transition-all duration-300 safe-top",
            isMobile ? "top-4 left-4 right-4" : "top-6 left-6 w-96 lg:w-[450px]"
          )}>
            <Card className={cn(
              "p-1 px-3 flex flex-col shadow-2xl border-none bg-white/95 backdrop-blur",
              isMobile && "rounded-2xl border border-gray-100"
            )}>
              <div className="flex items-center gap-2">
                {isMobile ? (
                  <>
                    <button onClick={() => setIsSidebarOpen(true)} className="text-primary p-2 -ml-1 border-r border-gray-100 mr-1">
                      <MapPin size={20} />
                    </button>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="text-primary">
                        {isSearchingMapbox ? <div className="w-4 h-4 border-2 border-primary border-t-transparent animate-spin rounded-full" /> : <Search size={18} />}
                      </div>
                      <input type="text" placeholder="Buscar POI..." className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 font-medium" value={searchQuery} onChange={(e) => handleMapboxSearch(e.target.value)} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-primary">
                      {isSearchingMapbox ? <div className="w-4 h-4 border-2 border-primary border-t-transparent animate-spin rounded-full" /> : <Search size={18} />}
                    </div>
                    <input type="text" placeholder="Buscar dirección o POI..." className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 font-medium" value={searchQuery} onChange={(e) => handleMapboxSearch(e.target.value)} />
                  </>
                )}
                
                <div className="flex items-center gap-1.5 ml-1 pl-2 pr-1 border-l border-gray-100">
                  <button onClick={() => setShowHeatmap(!showHeatmap)} className={cn("p-1.5 rounded-lg transition-all", showHeatmap ? "bg-primary/20 text-primary" : "hover:bg-gray-100 text-gray-400")} title="Mapa de Calor">
                    <Layers size={18} />
                  </button>
                  <button className="relative p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <Bell className="w-4 h-4 text-gray-500" />
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
                  </button>
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm border border-black/5 ml-1">
                    <Shield className="text-black" size={14} />
                  </div>
                </div>
              </div>

              {/* Suggestions Dropdown */}
              {mapboxSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl z-[60] max-h-[300px] overflow-y-auto">
                  {mapboxSuggestions.map((res, i) => (
                    <button key={i} className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b last:border-0 border-gray-50" onClick={() => handleSelectMapboxResult(res)}>
                      <p className="text-xs font-bold text-gray-900 line-clamp-1">{res.displayName}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{res.city}, {res.state}</p>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <MapView
            center={mapCenter}
            objectives={data.objectives}
            guards={data.resources}
            incidents={data.recentIncidents}
            className="w-full h-full"
            onObjectiveSelect={(obj) => setSelectedObjective(obj)}
            onMapClick={(coords) => { if (isAddingPoint) setLastClickedCoords(coords); }}
            onReverseGeocode={(address) => { if (isAddingPoint) setNewObjective(prev => ({ ...prev, address })); }}
            isPickerMode={isAddingPoint}
            draftCoords={lastClickedCoords}
            selectedObjectiveId={selectedObjective?.id}
            showHeatmap={showHeatmap}
          />
        </div>
        
        <LiveActivityFeed liveFeed={liveFeed} isMobile={isMobile} />

        <AnimatePresence>
          {newIncidentNotification && (
            <motion.div initial={{ y: -100, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -100, opacity: 0, scale: 0.8 }} className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4">
              <div className="bg-red-600 text-white rounded-2xl shadow-[0_20px_50px_rgba(220,38,38,0.5)] p-4 border border-white/20 flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center animate-pulse">
                  <Zap size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Alerta en Tiempo Real</p>
                  <p className="text-sm font-bold leading-tight">{newIncidentNotification.content}</p>
                </div>
                <button onClick={() => setNewIncidentNotification(null)} className="p-2 hover:bg-white/10 rounded-full">
                  <X size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ObjectiveDetailPanel 
          selectedObjective={selectedObjective}
          isAddingPoint={isAddingPoint}
          isMobile={isMobile}
          setSelectedObjective={setSelectedObjective}
          handleDeleteObjective={handleDeleteObjective}
        />

        <NewObjectiveForm 
          lastClickedCoords={lastClickedCoords}
          isMobile={isMobile}
          newObjective={newObjective}
          setNewObjective={setNewObjective}
          setLastClickedCoords={setLastClickedCoords}
          addressSuggestions={addressSuggestions}
          setAddressSuggestions={setAddressSuggestions}
          isSearchingAddress={isSearchingAddress}
          searchAddresses={searchAddresses}
          geocodeForward={geocodeForward}
          handleAddObjective={handleAddObjective}
        />

      </div>

      {isMobile && !isAddingPoint && (
        <button
          onClick={() => setIsAddingPoint(true)}
          className="fixed bottom-28 right-6 w-14 h-14 bg-primary text-black rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex items-center justify-center z-[60] border-4 border-white active:scale-95 transition-transform"
        >
          <Plus size={28} />
        </button>
      )}
    </div>
  );
}
