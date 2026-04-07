'use client';

import React, { useState } from 'react';
import { 
  Camera, MapPin, Phone, ShieldAlert,
  MessageSquare, FileText, Video, Mic, User
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';

// SSR must be disabled for Leaflet components
const MobileLeaflet = dynamic(() => import('@/components/operador/MobileLeaflet'), { ssr: false });

// Mock routing data simulating "Pedido Ya" tracking
const GUARD_POSITION: [number, number] = [-34.6037, -58.3816];
const MOCK_DESTINATIONS = [
  { id: '1', name: 'Plaza de Mayo', position: [-34.6083, -58.3712] as [number, number] },
  { id: '2', name: 'Puerto Madero', position: [-34.6118, -58.3646] as [number, number] }
];
const MOCK_ROUTE: [number, number][] = [
  GUARD_POSITION, 
  [-34.6050, -58.3750], 
  [-34.6083, -58.3712], // Dest 1
  [-34.6100, -58.3680],
  [-34.6118, -58.3646]  // Dest 2
];

export default function MobileOperatorDashboard() {
  const [sheetOpen, setSheetOpen] = useState(true);
  const [rondaActive, setRondaActive] = useState(false);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-zinc-100">
      
      {/* 1. MAP LAYER (Underneath everything) */}
      <div className="absolute inset-0 z-0">
        <MobileLeaflet 
          currentPosition={GUARD_POSITION} 
          routePoints={rondaActive ? MOCK_ROUTE : []}
          destinations={MOCK_DESTINATIONS}
        />
      </div>

      {/* 2. TOP NAV OVERLAY (E.g. Logo & Title) */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent flex justify-center items-center pointer-events-none">
        <div className="bg-primary px-4 py-2 rounded-full shadow-lg pointer-events-auto">
          <h1 className="text-black font-bold text-sm">SPS VigiControl</h1>
        </div>
      </div>

      {/* 3. BUTTON TO RE-OPEN SHEET (If closed manually) */}
      {!sheetOpen && (
        <button 
          onClick={() => setSheetOpen(true)}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-primary text-black px-6 py-3 rounded-full font-bold shadow-xl flex items-center gap-2"
        >
          <MapPin size={18} /> Ver Tareas
        </button>
      )}

      {/* 4. BOTTOM SHEET LAYER (Tasks & Actions) */}
      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} height="65vh">
        <div className="flex flex-col h-full gap-4">
          
          {/* Header info */}
          <div className="text-center mb-2">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Rondas Guiadas</h2>
            <p className="text-sm text-gray-500">Asignación: Plaza de Mayo</p>
          </div>

          {!rondaActive ? (
            // PRE-ROUND STATE
            <div className="flex-1 flex flex-col justify-end gap-3">
              <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-4 mb-4">
                <div className="flex justify-between border-b border-gray-200 dark:border-zinc-700 pb-3 mb-3">
                  <span className="font-bold text-gray-800 dark:text-gray-200">Ronda 1</span>
                  <MapPin className="text-gray-400" />
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p>Inicio: 06:00hs</p>
                  <p>Duración est.: 45 min</p>
                </div>
              </div>

              <Button 
                onClick={() => setRondaActive(true)}
                className="w-full h-14 bg-green-500 hover:bg-green-600 text-white rounded-xl text-lg shadow-lg shadow-green-500/20"
              >
                INICIAR RONDA
              </Button>
              <Button 
                variant="destructive"
                className="w-full h-14 bg-red-500 hover:bg-red-600 text-white rounded-xl text-lg shadow-lg shadow-red-500/20"
              >
                EMERGENCIA
              </Button>
            </div>
          ) : (
            // ACTIVE ROUND STATE (Grid of actions)
            <div className="flex-1 flex flex-col gap-4">
              
              <Button 
                className="w-full h-14 bg-green-500 hover:bg-green-600 text-white rounded-xl text-lg font-bold shadow-lg shadow-green-500/20 mb-2"
                onClick={() => {
                  alert('Arribo notificado con éxito');
                  setRondaActive(false);
                }}
              >
                Notificar arribo
              </Button>

              <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                  <User size={24} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Operador Activo</p>
                  <p className="font-bold text-gray-800 dark:text-gray-200">J. Méndez</p>
                </div>
              </div>

              {/* ACTION GRID */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { icon: MessageSquare, label: 'SMS' },
                  { icon: FileText, label: 'Historial' },
                  { icon: Phone, label: 'Llamada' },
                  { icon: ShieldAlert, label: 'Pánico' },
                  { icon: FileText, label: 'Texto' },
                  { icon: Camera, label: 'Foto' },
                  { icon: Video, label: 'Video' },
                  { icon: Mic, label: 'Audio' },
                ].map((action, i) => (
                  <button 
                    key={i} 
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all text-gray-700 dark:text-gray-300"
                  >
                    <action.icon size={22} className={action.label === 'Pánico' ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'} />
                    <span className="text-[10px] font-medium">{action.label}</span>
                  </button>
                ))}
              </div>

              <Button 
                variant="destructive"
                className="w-full h-14 mt-auto bg-red-500 hover:bg-red-600 text-white rounded-xl text-lg shadow-lg shadow-red-500/20"
              >
                EMERGENCIA GLOBAL
              </Button>
            </div>
          )}

        </div>
      </BottomSheet>
      
    </div>
  );
}
