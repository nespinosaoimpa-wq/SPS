'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  MapPin, 
  X, 
  ChevronRight,
  Plus
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
  activeGuards
}: ObjectiveSidebarProps) {
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
                onChange={(e) => handleMapboxSearch(e.target.value)}
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
  );
}
