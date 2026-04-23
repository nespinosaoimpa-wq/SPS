'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  MapPin, 
  Building2, 
  Phone, 
  User, 
  Clock, 
  ChevronRight, 
  Trash2,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ObjectiveDetailPanelProps {
  selectedObjective: any;
  isAddingPoint: boolean;
  isMobile: boolean;
  setSelectedObjective: (val: any) => void;
  handleDeleteObjective: (id: string, name: string) => void;
}

export function ObjectiveDetailPanel({
  selectedObjective,
  isAddingPoint,
  isMobile,
  setSelectedObjective,
  handleDeleteObjective
}: ObjectiveDetailPanelProps) {
  return (
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

          {/* Action Buttons */}
          <div className="flex gap-3 mt-auto">
            <Link href={`/gerente/objetivos/${selectedObjective.id}`} className="flex-1">
              <Button variant="default" className="w-full h-11 text-[11px] font-black uppercase tracking-widest bg-gray-900">
                Ver Detalle
                <ChevronRight size={14} />
              </Button>
            </Link>
            <Button 
              variant="outline" 
               size="icon"
              className="h-11 w-11 shrink-0 border-red-100 text-red-500 hover:bg-red-50"
              onClick={() => handleDeleteObjective(selectedObjective.id, selectedObjective.name)}
            >
              <Trash2 size={18} />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface NewObjectiveFormProps {
  lastClickedCoords: any;
  isMobile: boolean;
  newObjective: any;
  setNewObjective: (val: any) => void;
  setLastClickedCoords: (val: any) => void;
  addressSuggestions: any[];
  setAddressSuggestions: (val: any[]) => void;
  isSearchingAddress: boolean;
  searchAddresses: (val: string) => Promise<any[]>;
  geocodeForward: (val: string) => Promise<any[]>;
  handleAddObjective: (e: React.FormEvent) => void;
}

export function NewObjectiveForm({
  lastClickedCoords,
  isMobile,
  newObjective,
  setNewObjective,
  setLastClickedCoords,
  addressSuggestions,
  setAddressSuggestions,
  isSearchingAddress,
  searchAddresses,
  geocodeForward,
  handleAddObjective
}: NewObjectiveFormProps) {
  return (
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
                <div className="flex-1 relative">
                  <Input 
                    required 
                    placeholder="Ej: San Martín 1500, Santa Fe" 
                    className={cn(
                      "w-full",
                      lastClickedCoords ? "border-green-200 bg-green-50/20" : ""
                    )}
                    value={newObjective.address}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setNewObjective({...newObjective, address: val});
                      if (val.length > 3) {
                        const results = await searchAddresses(val);
                        setAddressSuggestions(results);
                      } else {
                        setAddressSuggestions([]);
                      }
                    }} 
                  />
                  {addressSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-[60] max-h-[200px] overflow-y-auto">
                      {addressSuggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b last:border-0 border-gray-50"
                          onClick={() => {
                            setNewObjective({...newObjective, address: s.displayName});
                            setLastClickedCoords({ lat: s.lat, lng: s.lng });
                            setAddressSuggestions([]);
                          }}
                        >
                          <p className="text-xs font-bold text-gray-900 line-clamp-1">{s.displayName}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-tighter mt-0.5">{s.type}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  className="shrink-0 h-10 px-3"
                  disabled={isSearchingAddress}
                  onClick={async () => {
                    if (!newObjective.address) return;
                    try {
                      const results = await geocodeForward(newObjective.address);
                      if (results && results.length > 0) {
                        const first = results[0];
                        setLastClickedCoords({ lat: first.lat, lng: first.lng });
                        setNewObjective(prev => ({ ...prev, address: first.displayName }));
                      } else {
                        alert("No se encontró la dirección exacta. Intenta ser más específico o marcarla en el mapa.");
                      }
                    } catch (err) {
                      console.error(err);
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
            {lastClickedCoords && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Coordenadas Verificadas</p>
                  <p className="text-[11px] font-bold text-green-500">{lastClickedCoords.lat.toFixed(6)}, {lastClickedCoords.lng.toFixed(6)}</p>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full h-12 font-bold uppercase tracking-widest">
              Guardar Objetivo
            </Button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
