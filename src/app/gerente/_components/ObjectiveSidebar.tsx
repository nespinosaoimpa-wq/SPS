'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  MapPin, 
  X, 
  ChevronRight,
  Plus,
  User,
  Radar,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface ObjectiveSidebarProps {
  isSidebarOpen: boolean;
  isMobile: boolean;
  isConfigured: boolean;
  isAddingPoint: boolean;
  setIsAddingPoint: (val: boolean) => void;
  setLastClickedCoords: (val: any) => void;
  setIsSidebarOpen: (val: boolean) => void;
  searchQuery: string;
  handleMapboxSearch: (val: string) => void;
  filteredObjectives: any[];
  selectedObjective: any;
  setSelectedObjective: (val: any) => void;
  activeGuards: any[];
  onGuardSelect?: (guard: any) => void;
}

export function ObjectiveSidebar({
  isSidebarOpen,
  isMobile,
  isConfigured,
  isAddingPoint,
  setIsAddingPoint,
  setLastClickedCoords,
  setIsSidebarOpen,
  searchQuery,
  handleMapboxSearch,
  filteredObjectives,
  selectedObjective,
  setSelectedObjective,
  activeGuards,
  onGuardSelect
}: ObjectiveSidebarProps) {
  const [activeTab, setActiveTab] = React.useState<'objectives' | 'operators' | 'payroll'>('objectives');

  return (
    <AnimatePresence>
      {isSidebarOpen && (
        <motion.div
          initial={{ x: -320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -320, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className={cn(
            "h-full bg-zinc-50 border-r border-zinc-200 flex flex-col z-[40] shadow-sm",
            isMobile ? "absolute inset-0 w-full" : "relative w-[340px] shrink-0"
          )}
        >
          {/* Header */}
          <div className="p-6 pb-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tighter italic leading-none">Control de Operaciones</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isConfigured ? "bg-[#D4AF37]" : "bg-amber-500")} />
                  <p className="text-[10px] text-zinc-400 font-black tracking-[0.2em] uppercase">{isConfigured ? 'Elite Connection' : 'Demo Mode'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsAddingPoint(!isAddingPoint);
                    setLastClickedCoords(null);
                    if (isMobile) setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border transition-all flex items-center gap-2 shadow-sm",
                    isAddingPoint 
                      ? "bg-red-50 border-red-200 text-red-500" 
                      : "bg-white border-zinc-200 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
                  )}
                >
                  {isAddingPoint ? <><X size={14} /> Cancelar</> : <><Plus size={14} /> Nuevo</>}
                </button>
                {isMobile && (
                  <Button size="sm" variant="ghost" onClick={() => setIsSidebarOpen(false)} className="text-zinc-400">
                    <X size={18} />
                  </Button>
                )}
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex p-1 bg-zinc-100/50 border border-zinc-200 rounded-xl mb-4">
              {(['objectives', 'operators', 'payroll'] as const).map((tab) => (
                <button 
                  key={tab}
                  onClick={() => tab === 'payroll' ? (window.location.href = '/gerente/planillas') : setActiveTab(tab)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                    activeTab === tab ? "bg-white text-[#D4AF37] shadow-sm border border-zinc-200" : "text-zinc-500 hover:text-zinc-700"
                  )}
                >
                  {tab === 'objectives' && <MapPin size={12} />}
                  {tab === 'operators' && (
                    <div className="relative">
                      <User size={12} />
                      <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-[#D4AF37] rounded-full border border-white" />
                    </div> 
                  )}
                  {tab === 'payroll' && <Clock size={12} />}
                  {tab === 'objectives' ? 'Objetivos' : tab === 'operators' ? 'Personal' : 'Planillas'}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input
                type="text"
                placeholder={activeTab === 'objectives' ? "Filtrar objetivos..." : "Filtrar personal..."}
                className="w-full bg-white border border-zinc-200 rounded-xl py-2.5 pl-10 pr-4 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 shadow-sm"
                value={searchQuery}
                onChange={(e) => handleMapboxSearch(e.target.value)}
              />
            </div>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'objectives' ? (
              filteredObjectives.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 opacity-50">
                  <MapPin size={48} className="mb-4 text-gray-200" strokeWidth={1} />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Sin objetivos vinculados</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {filteredObjectives.map((obj: any) => (
                    <button
                      key={obj.id}
                      onClick={() => {
                        setSelectedObjective(obj);
                        if (isMobile) setIsSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full text-left p-4 rounded-xl transition-all border shadow-sm",
                        selectedObjective?.id === obj.id
                          ? "bg-white border-[#D4AF37]/50 ring-1 ring-[#D4AF37]/20"
                          : "bg-white border-zinc-200 hover:border-zinc-300"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all overflow-hidden bg-zinc-50",
                          obj.is_manned ? "border-[#D4AF37]/30 shadow-sm" : "border-zinc-200"
                        )}>
                          {obj.is_manned && (obj.assigned_personnel?.[0]?.profiles?.avatar_url || obj.assigned_personnel?.[0]?.avatar_url) ? (
                            <img src={obj.assigned_personnel[0].profiles?.avatar_url || obj.assigned_personnel[0].avatar_url} className="w-full h-full object-cover" alt={obj.name} />
                          ) : (
                            <MapPin size={20} className={cn(obj.is_manned ? "text-[#D4AF37]" : "text-zinc-300")} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xs font-black text-zinc-900 uppercase tracking-tight truncate">{obj.name}</h3>
                          {obj.occupant_name ? (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                              <p className="text-[10px] text-[#D4AF37] font-black uppercase truncate">{obj.occupant_name}</p>
                            </div>
                          ) : (
                            obj.address && <p className="text-[10px] text-zinc-400 font-bold uppercase truncate tracking-widest mt-0.5">{obj.address}</p>
                          )}
                          <div className="flex items-center gap-2 mt-3">
                            <div className={cn(
                              "text-[9px] font-black uppercase tracking-[0.1em]",
                              obj.is_manned ? "text-[#D4AF37]" : "text-zinc-400"
                            )}>
                              {obj.is_manned ? '• Cubierto' : obj.status}
                            </div>
                            <span className="text-zinc-200 text-[10px]">|</span>
                            <span className="text-[9px] text-zinc-300 font-bold uppercase tracking-widest">OBJ-{obj.id.substring(0, 4)}</span>
                          </div>
                        </div>
                        <ChevronRight size={16} className={cn("mt-1 transition-colors", selectedObjective?.id === obj.id ? "text-[#D4AF37]" : "text-zinc-200")} />
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : (
              // OPERATORS TAB
              activeGuards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 opacity-50">
                  <User size={48} className="mb-4 text-gray-200" strokeWidth={1} />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Sin personal en servicio</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {activeGuards.map((guard: any) => (
                    <button
                      key={guard.id}
                      onClick={() => onGuardSelect?.(guard)}
                      className="w-full text-left p-4 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 shadow-sm transition-all"
                    >
                       <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-xl bg-zinc-50 flex items-center justify-center text-[#D4AF37] font-black uppercase text-xs border border-zinc-100 overflow-hidden">
                            {guard.profiles?.avatar_url || guard.avatar_url ? (
                              <img src={guard.profiles?.avatar_url || guard.avatar_url} className="w-full h-full object-cover" alt={guard.name} />
                            ) : (
                              guard.name?.split(' ').map((n:any) => n[0]).join('').slice(0, 2) || 'G'
                            )}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#D4AF37] border-2 border-white rounded-full shadow-sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-black text-zinc-900 uppercase tracking-tighter truncate">{guard.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-[0.1em] truncate">
                                {guard.objectives?.name || 'Patrullaje Activo'}
                              </p>
                            </div>
                          <div className="flex items-center gap-2 mt-2">
                             <div className="px-1.5 py-0.5 bg-zinc-100 rounded text-[7px] font-black text-zinc-500 uppercase tracking-[0.15em]">
                                U-TRACK LIVE
                             </div>
                             {guard.accuracy && (
                               <div className="text-[7px] text-zinc-300 font-bold">
                                 ACC: {Math.round(guard.accuracy)}m
                                </div>
                             )}
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-zinc-200" />
                      </div>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Quick Stats Footer */}
          <div className="p-5 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Fuerza Operativa</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <MapPin size={12} className="text-[#D4AF37]" />
                  <span className="text-xs font-black text-zinc-900">{filteredObjectives.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User size={12} className="text-[#D4AF37]" />
                  <span className="text-xs font-black text-zinc-900">{activeGuards.length}</span>
                </div>
              </div>
            </div>
            <div className="w-10 h-10 bg-white rounded-xl border border-zinc-200 flex items-center justify-center text-zinc-400 shadow-sm">
               <Radar size={16} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
