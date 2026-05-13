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
  Search,
  Target,
  MessageSquare,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface ObjectiveDetailPanelProps {
  selectedObjective: any;
  isAddingPoint: boolean;
  isMobile: boolean;
  activeGuards?: any[];
  activeShifts?: any[];
  onAssignOperator?: (objectiveId: string, operatorId: string) => Promise<void>;
  setSelectedObjective: (val: any) => void;
  handleDeleteObjective: (id: string, name: string) => void;
}

export function ObjectiveDetailPanel({
  selectedObjective,
  isAddingPoint,
  isMobile,
  activeGuards = [],
  activeShifts = [],
  onAssignOperator,
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
            "z-[50] bg-white/95 backdrop-blur-xl border-t border-white/20 shadow-2xl",
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
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter truncate">{selectedObjective.name}</h3>
                {selectedObjective.address && (
                  <p className="text-xs text-gray-500 font-bold tracking-widest uppercase mt-0.5 truncate">{selectedObjective.address}</p>
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

          {/* Guard on duty / Assignment */}
          <div className="p-3 bg-gray-50 rounded-xl mb-4 border border-gray-100">
            {(() => {
              // Priority 1: Guard with live pulse at this objective
              let assignedGuard = activeGuards.find(g => g.current_objective_id === selectedObjective.id);
              
              // Priority 2: Guard assigned via deep join (even if no live pulse yet)
              if (!assignedGuard && selectedObjective.assigned_personnel?.length > 0) {
                assignedGuard = selectedObjective.assigned_personnel[0];
              }

              const activeShift = activeShifts.find(s => s.objective_id === selectedObjective.id || (assignedGuard && s.operator_id === assignedGuard.id));

              if (assignedGuard) {
                return (
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden", activeShift ? "bg-green-100 border-2 border-green-500" : "bg-gray-200")}>
                      {assignedGuard.profiles?.avatar_url || assignedGuard.avatar_url ? (
                        <img src={assignedGuard.profiles?.avatar_url || assignedGuard.avatar_url} className="w-full h-full object-cover" alt={assignedGuard.name} />
                      ) : (
                        <User size={16} className={activeShift ? "text-green-700" : "text-gray-500"} />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                         <p className="text-sm font-bold text-gray-900">{assignedGuard.name}</p>
                         {activeShift ? (
                           <span className="text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded font-black uppercase">En puesto</span>
                         ) : (
                           <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-black uppercase">Asignado (Sin Fichar)</span>
                         )}
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">Legajo: {assignedGuard.id}</p>
                    </div>
                    {onAssignOperator && (
                      <Button variant="ghost" size="sm" className="text-xs px-2 h-8 text-gray-400 hover:text-red-500" onClick={() => onAssignOperator(selectedObjective.id, '')}>
                        Liberar
                      </Button>
                    )}
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <User size={14} />
                    <p className="text-xs font-semibold">Sin personal asignado</p>
                  </div>
                  {onAssignOperator && (
                    <select 
                      className="w-full h-9 text-xs border border-gray-200 rounded-lg px-2 bg-white"
                      onChange={(e) => {
                        if (e.target.value) onAssignOperator(selectedObjective.id, e.target.value);
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Asignar operador libre...</option>
                      {activeGuards.filter(g => !g.current_objective_id).map(g => (
                        <option key={g.id} value={g.id}>{g.name} ({g.id})</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })()}
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
            
            {activeGuards.find(g => g.current_objective_id === selectedObjective.id) && (
              <Button 
                variant="outline" 
                size="icon"
                className="h-11 w-11 shrink-0 border-blue-100 text-blue-500 hover:bg-blue-50"
                onClick={async () => {
                  const msg = prompt('Enviar mensaje al operador:');
                  if (!msg) return;
                  const guard = activeGuards.find(g => g.current_objective_id === selectedObjective.id);
                  const { error } = await supabase.from('system_notifications').insert({
                    sender_id: 'manager',
                    receiver_id: guard.id,
                    title: 'Mensaje de Gerencia',
                    message: msg,
                    type: 'command'
                  });
                  if (error) alert(error.message);
                  else alert('Mensaje enviado.');
                }}
              >
                <MessageSquare size={18} />
              </Button>
            )}
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
            "z-[50] bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl",
            isMobile
              ? "fixed inset-x-0 bottom-0 rounded-t-3xl p-5 pb-24 max-h-[80vh] overflow-y-auto"
              : "absolute bottom-6 left-1/2 -translate-x-1/2 w-[480px] rounded-2xl p-6"
          )}
        >
          <div className="flex justify-between items-center mb-5">
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter truncate">Nuevo Objetivo</h3>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5 truncate">Completá los datos del lugar</p>
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
                    placeholder="Ej: San Martín 1500, 704" 
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-10 px-3 border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                  title="Usar mi ubicación actual"
                  onClick={() => {
                    if (!navigator.geolocation) return alert("Geolocalización no soportada en este navegador.");
                    navigator.geolocation.getCurrentPosition(
                      async (pos) => {
                        const { latitude, longitude } = pos.coords;
                        setLastClickedCoords({ lat: latitude, lng: longitude });
                        try {
                          const results = await searchAddresses(`${latitude}, ${longitude}`);
                          if (results && results.length > 0) {
                            setNewObjective(prev => ({ ...prev, address: results[0].displayName }));
                          }
                        } catch (e) {
                          console.error("Reverse geocoding error:", e);
                        }
                      },
                      (err) => alert("Error obteniendo ubicación: " + err.message),
                      { enableHighAccuracy: true }
                    );
                  }}
                >
                  <MapPin size={16} />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5 pb-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Teléfono de contacto</label>
              <Input placeholder="Ej: 342 555-0123" value={newObjective.contact_phone}
                onChange={e => setNewObjective({...newObjective, contact_phone: e.target.value})} 
                className="h-11 rounded-xl text-sm"
              />
            </div>

            {/* Coords indicator & Precision Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Localización Geográfica</label>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[9px] font-black uppercase text-blue-600">Grado Operativo</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-gray-300 uppercase ml-1">Latitud</span>
                  <Input 
                    type="number" 
                    step="any"
                    placeholder="-31.6..."
                    value={lastClickedCoords?.lat || ''}
                    onChange={(e) => setLastClickedCoords({ ...lastClickedCoords, lat: parseFloat(e.target.value) })}
                    className="h-11 rounded-xl text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-gray-300 uppercase ml-1">Longitud</span>
                  <Input 
                    type="number" 
                    step="any"
                    placeholder="-60.7..."
                    value={lastClickedCoords?.lng || ''}
                    onChange={(e) => setLastClickedCoords({ ...lastClickedCoords, lng: parseFloat(e.target.value) })}
                    className="h-11 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {lastClickedCoords && (
                <div className="flex items-center gap-3 p-4 bg-zinc-900 rounded-2xl border border-white/5 shadow-inner">
                  <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 border border-primary/20">
                    <Target size={20} className="animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-primary/70 uppercase tracking-widest">Pin de Operativo Confirmado</p>
                    <p className="text-[10px] font-medium text-gray-400 truncate mt-0.5">
                      {newObjective.address || 'Ubicación seleccionada en mapa'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-white uppercase tracking-tighter">HD Precision</p>
                    <p className="text-[9px] text-gray-500">± 0.000001°</p>
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full h-12 font-bold uppercase tracking-widest">
              Guardar Objetivo
            </Button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
