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
  Radar
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
  const [activeTab, setActiveTab] = React.useState<'objectives' | 'operators'>('objectives');

  return (
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
                <h2 className="text-lg font-black text-gray-900 uppercase tracking-tighter italic">Despliegue Táctico</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={cn("w-2 h-2 rounded-full animate-pulse", isConfigured ? "bg-green-500" : "bg-amber-500")} />
                  <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">{isConfigured ? 'Live Connection' : 'Demo Mode'}</p>
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
                  className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest"
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

            {/* Tab Switcher */}
            <div className="flex p-1 bg-gray-100 rounded-xl">
              <button 
                onClick={() => setActiveTab('objectives')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                  activeTab === 'objectives' ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <MapPin size={12} /> Objetivos
              </button>
              <button 
                onClick={() => setActiveTab('operators')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                  activeTab === 'operators' ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <div className="relative">
                  <User size={12} />
                  <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-green-500 rounded-full border border-white" />
                </div> 
                Personal
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder={activeTab === 'objectives' ? "Buscar objetivo..." : "Buscar operador..."}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
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
                  <p className="text-[10px] font-bold uppercase tracking-widest">Sin objetivos estratégicos</p>
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
                        "w-full text-left p-4 rounded-2xl transition-all border",
                        selectedObjective?.id === obj.id
                          ? "bg-primary/5 border-primary/20 shadow-sm"
                          : "hover:bg-gray-50 border-transparent"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm",
                          obj.status === 'Activo' ? "bg-white text-primary border-primary/10" : "bg-gray-50 text-gray-300 border-gray-100"
                        )}>
                          <MapPin size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight truncate">{obj.name}</h3>
                          {obj.address && <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">{obj.address}</p>}
                          <div className="flex items-center gap-2 mt-3">
                            <div className={cn(
                              "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter",
                              obj.status === 'Activo' ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
                            )}>
                              {obj.status}
                            </div>
                            <span className="text-gray-200 text-[10px]">•</span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">OBJ-{obj.id.substring(0, 4)}</span>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-200 mt-1" />
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
                <div className="p-3 space-y-1">
                  {activeGuards.map((guard: any) => (
                    <button
                      key={guard.id}
                      onClick={() => onGuardSelect?.(guard)}
                      className="w-full text-left p-4 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
                    >
                       <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center text-primary font-black uppercase text-sm border-2 border-primary/20">
                            {guard.name?.charAt(0) || 'G'}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter truncate">{guard.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Transmitiendo GPS</p>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                             <div className="px-2 py-0.5 bg-gray-100 rounded text-[8px] font-black text-gray-500 uppercase tracking-tighter">
                               HD Tracking
                             </div>
                             {guard.accuracy && (
                               <div className="text-[8px] text-gray-400 font-bold">
                                 ± {Math.round(guard.accuracy)}m
                               </div>
                             )}
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-200" />
                      </div>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Quick Stats Footer */}
          <div className="p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Capacidad Instalada</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-primary" />
                  <span className="text-sm font-black text-gray-900">{filteredObjectives.length}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User size={12} className="text-green-500" />
                  <span className="text-sm font-black text-gray-900">{activeGuards.length}</span>
                </div>
              </div>
            </div>
            <div className="w-10 h-10 bg-white rounded-xl border border-gray-100 flex items-center justify-center text-gray-300">
               <Radar size={16} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
