'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RotateCw, 
  Navigation,
  ShieldCheck,
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  MapPin,
  Scan,
  ChevronRight,
  ShieldAlert,
  Compass,
  Globe,
  Activity
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { QRScanner } from '@/components/ui/QRScanner';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const MobileLeaflet = dynamic(() => import('@/components/operador/MobileLeaflet'), { ssr: false });

const checkpoints = [
  { id: 1, name: 'Portón Principal A1', status: 'validated', time: '14:20', position: [-34.6037, -58.3816] },
  { id: 2, name: 'Depósito de Insumos', status: 'validated', time: '14:35', position: [-34.6047, -58.3826] },
  { id: 3, name: 'Perímetro Norte - Punto 4', status: 'active', time: 'En proceso', position: [-34.6057, -58.3836] },
  { id: 4, name: 'Salida de Emergencia 2', status: 'pending', time: '--:--', position: [-34.6067, -58.3846] },
  { id: 5, name: 'Generadores Eléctricos', status: 'pending', time: '--:--', position: [-34.6077, -58.3856] },
];

export default function RondinesPage() {
  const [showScanner, setShowScanner] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showMapHUD, setShowMapHUD] = useState(true);

  const handleValidationClick = () => {
    setShowScanner(true);
  };

  const handleScanSuccess = async (qrData: string) => {
    setShowScanner(false);
    setValidating(true);
    // Simulate API call to /api/patrols/checkpoint
    setTimeout(() => {
      setValidating(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white">
      
      {/* Tactical GPS Overlay / Map View */}
      <div className={cn(
        "relative transition-all duration-500 overflow-hidden border-b border-primary/20",
        showMapHUD ? "h-[35vh]" : "h-16"
      )}>
        <div className="absolute inset-0 z-0">
          <MobileLeaflet 
            currentPosition={[-34.6050, -58.3830]} 
            destinations={checkpoints.map(cp => ({ id: cp.id.toString(), name: cp.name, position: cp.position as [number, number] }))}
          />
        </div>
        
        {/* Map HUD Accents */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black to-transparent pointer-events-none z-10" />
        
        <div className="absolute top-4 right-4 z-20">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-sm border border-primary/30 backdrop-blur-md bg-black/40"
            onClick={() => setShowMapHUD(!showMapHUD)}
          >
            <Compass className={cn("text-primary transition-transform", showMapHUD && "rotate-180")} size={16} />
          </Button>
        </div>

        {!showMapHUD && (
          <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-lg flex items-center px-6">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-primary/40" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Navegación Táctica Activa</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6 pb-32 flex-1 overflow-y-auto">
        
        {/* Active Node Stats */}
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-display mb-1 flex items-center gap-2">
              <Scan size={10} className="text-primary" /> Nodo Actual
            </p>
            <h1 className="text-2xl font-black uppercase tracking-tighter leading-tight italic">
              Sector 04<br/>Perímetro Norte
            </h1>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-primary font-black uppercase mb-1">Status: En Rango</p>
            <div className="flex justify-end gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={cn(
                  "w-3 h-1 rounded-full",
                  i <= 2 ? "bg-primary" : "bg-white/10"
                )} />
              ))}
            </div>
          </div>
        </div>

        {/* Validation Target */}
        <Card className="border-primary/40 bg-zinc-950/40 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center relative">
                <MapPin className="text-primary" size={24} />
                <div className="absolute inset-0 bg-primary/5 animate-ping rounded-sm" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight text-white">Salida de Emergencia 2</h3>
                <p className="text-[10px] text-gray-500 uppercase font-mono">Próximo Punto — 45m de distancia</p>
              </div>
            </div>

            <Button 
              className="w-full h-16 text-sm font-black tracking-[0.4em] uppercase shadow-[0_0_20px_rgba(255,215,0,0.1)] group relative overflow-hidden"
              onClick={handleValidationClick}
              disabled={validating}
              variant="tactical"
            >
              {validating ? (
                <span className="flex items-center gap-2">
                  <RotateCw size={16} className="animate-spin" /> SINCRONIZANDO...
                </span>
              ) : (
                <span className="flex items-center gap-2 relative z-10">
                   <ShieldCheck size={20} /> ESCANEAR QR TÁCTICO
                </span>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Checkpoint Sequence */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Secuencia del Operativo</h3>
            <span className="text-[10px] font-mono text-primary font-bold">2/5 NODOS</span>
          </div>
          
          <div className="space-y-2 relative">
            <div className="absolute left-6 top-4 bottom-4 w-px bg-white/5" />
            
            {checkpoints.map((cp, i) => (
              <motion.div 
                key={cp.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "relative pl-12 pr-4 py-4 rounded-sm transition-all border",
                  cp.status === 'active' ? "border-primary/40 bg-primary/5" : 
                  cp.status === 'validated' ? "border-green-500/10 bg-zinc-900/40" : 
                  "border-white/5 bg-transparent opacity-50"
                )}
              >
                <div className={cn(
                  "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 z-10 flex items-center justify-center",
                  cp.status === 'validated' ? "bg-green-500 border-green-500 text-black" : 
                  cp.status === 'active' ? "bg-primary border-primary animate-pulse" : "bg-black border-white/20"
                )}>
                  {cp.status === 'validated' && <CheckCircle2 size={10} />}
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-[11px] font-black uppercase text-white tracking-widest">{cp.name}</h4>
                    <p className="text-[9px] text-gray-600 font-mono mt-0.5">{cp.time}</p>
                  </div>
                  {cp.status === 'active' && (
                     <div className="px-2 py-0.5 bg-primary/10 border border-primary/40 text-[8px] font-black text-primary uppercase rounded-full">
                        Actual
                     </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Tactical Footer Actions */}
        <div className="grid grid-cols-2 gap-3 pt-6">
          <Button variant="outline" className="h-12 border-primary/20 text-[10px] font-black tracking-widest text-primary uppercase">
            <ShieldAlert size={14} className="mr-2" /> Reportar Anomalía
          </Button>
          <Button variant="ghost" className="h-12 text-red-500/60 text-[10px] font-black tracking-widest uppercase hover:text-red-500">
             Abortar Operativo
          </Button>
        </div>
      </div>

      {showScanner && (
        <QRScanner 
          onScan={handleScanSuccess}
          onCancel={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
