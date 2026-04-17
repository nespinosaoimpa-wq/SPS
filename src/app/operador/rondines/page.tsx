'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RotateCw, Navigation, ShieldCheck, Clock, 
  CheckCircle2, AlertTriangle, MapPin, Scan, 
  ChevronRight, Compass, ShieldAlert, ArrowLeft
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { QRScanner } from '@/components/ui/QRScanner';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import Link from 'next/link';

import { useShift } from '@/components/providers/ShiftProvider';

const MobileLeaflet = dynamic(() => import('@/components/operador/MobileLeaflet'), { ssr: false });

const checkpointsData = [
  { id: 1, name: 'Portón Principal A1', status: 'validated', time: '14:20', position: [-34.6037, -58.3816] },
  { id: 2, name: 'Depósito de Insumos', status: 'validated', time: '14:35', position: [-34.6047, -58.3826] },
  { id: 3, name: 'Perímetro Norte - Punto 4', status: 'active', time: 'En proceso', position: [-34.6057, -58.3836] },
  { id: 4, name: 'Salida de Emergencia 2', status: 'pending', time: '--:--', position: [-34.6067, -58.3846] },
  { id: 5, name: 'Generadores Eléctricos', status: 'pending', time: '--:--', position: [-34.6077, -58.3856] },
];

export default function RondinesPage() {
  const { theme } = useShift();
  const [showScanner, setShowScanner] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showMapHUD, setShowMapHUD] = useState(true);

  const handleValidationClick = () => {
    setShowScanner(true);
  };

  const handleScanSuccess = async (qrData: string) => {
    setShowScanner(false);
    setValidating(true);
    setTimeout(() => {
      setValidating(false);
    }, 2000);
  };

  return (
    <div className={cn(
      "flex flex-col min-h-screen transition-colors duration-500",
      theme === 'dark' ? "bg-black text-white" : "bg-gray-50 text-gray-900"
    )}>
      
      {/* Mobile Map Header / Desktop Layout Wrapper */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        
        {/* Map Section (Fixed height on mobile, full height on desktop) */}
        <div className={cn(
          "relative transition-all duration-700 bg-zinc-900 border-b lg:border-r overflow-hidden",
          theme === 'dark' ? "border-white/5" : "border-gray-200",
          showMapHUD ? (isMobile() ? "h-[35vh]" : "lg:h-full lg:w-1/2") : "h-16 lg:w-20"
        )}>
          <div className="absolute inset-0 z-0">
             <MobileLeaflet 
               currentPosition={[-34.6050, -58.3830]} 
               destinations={checkpointsData.map(cp => ({ id: cp.id.toString(), name: cp.name, position: cp.position as [number, number] }))}
             />
          </div>

          {/* Map Overlay Controls */}
          <div className="absolute top-4 left-4 z-20 flex gap-2">
            <Link href="/operador">
               <button className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl shadow-lg flex items-center justify-center border border-gray-100 text-gray-600">
                  <ArrowLeft size={20} />
               </button>
            </Link>
          </div>

          <div className="absolute top-4 right-4 z-20">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "h-10 w-10 rounded-xl border backdrop-blur-md",
                theme === 'dark' ? "bg-black/40 border-primary/30 text-primary" : "bg-white/80 border-gray-100 text-gray-600"
              )}
              onClick={() => setShowMapHUD(!showMapHUD)}
            >
              <Compass className={cn("transition-transform", showMapHUD && "rotate-180")} size={20} />
            </Button>
          </div>
        </div>

        {/* content Section (Checkpoints & Actions) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 pb-32">
          <div className="max-w-2xl mx-auto space-y-8">
            
            {/* Header Status */}
            <div className="flex justify-between items-end">
              <div>
                <p className={cn("text-[10px] uppercase tracking-[0.3em] font-black mb-1 flex items-center gap-2", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
                  <Scan size={14} className="text-primary" /> Nodo de Operación
                </p>
                <h1 className={cn("text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-tight italic", theme === 'dark' ? "text-white" : "text-gray-900")}>
                  Sector 04<br/>Perímetro Norte
                </h1>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-primary font-black uppercase mb-1 tracking-widest italic">Status: En Rango</p>
                <div className="flex justify-end gap-1.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={cn(
                      "w-4 h-1.5 rounded-full",
                      i <= 2 ? "bg-primary" : (theme === 'dark' ? "bg-white/10" : "bg-gray-200")
                    )} />
                  ))}
                </div>
              </div>
            </div>

            {/* Validation Target Overlay */}
            <Card className={cn(
              "border-none shadow-2xl relative overflow-hidden transition-colors",
              theme === 'dark' ? "bg-zinc-900/40 backdrop-blur-md border border-white/5" : "bg-white"
            )}>
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
              <CardContent className="p-8">
                <div className="flex items-center gap-6 mb-8">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center relative shadow-xl",
                    theme === 'dark' ? "bg-zinc-800" : "bg-amber-50"
                  )}>
                    <MapPin className="text-primary" size={32} />
                    <div className="absolute inset-0 bg-primary/20 animate-ping rounded-2xl" />
                  </div>
                  <div>
                    <h3 className={cn("text-lg font-black uppercase tracking-tight", theme === 'dark' ? "text-white" : "text-gray-900")}>Salida de Emergencia 2</h3>
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">Próximo Punto — 45m de distancia</p>
                  </div>
                </div>

                <Button 
                  className="w-full h-18 text-xs font-black tracking-[0.4em] uppercase shadow-2xl shadow-primary/20 group relative overflow-hidden rounded-2xl"
                  onClick={handleValidationClick}
                  disabled={validating}
                  variant="primary"
                >
                  {validating ? (
                    <span className="flex items-center gap-3">
                      <RotateCw size={20} className="animate-spin" /> SINCRONIZANDO...
                    </span>
                  ) : (
                    <span className="flex items-center gap-3 relative z-10">
                       <ShieldCheck size={24} /> VALIDAR PUNTO DE CONTROL
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Checkpoint Sequence */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <h3 className={cn("text-[10px] font-black uppercase tracking-[0.2em]", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>Secuencia del Operativo</h3>
                <span className="text-[10px] font-black text-primary uppercase">2/5 NODOS COMPLETADOS</span>
              </div>
              
              <div className="space-y-3 relative">
                <div className={cn("absolute left-7 top-4 bottom-4 w-0.5", theme === 'dark' ? "bg-white/5" : "bg-gray-100")} />
                
                {checkpointsData.map((cp, i) => (
                  <motion.div 
                    key={cp.id}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={cn(
                      "relative pl-16 pr-6 py-5 rounded-2xl transition-all border shadow-sm",
                      cp.status === 'active' ? "border-primary/40 bg-primary/5 shadow-primary/5" : 
                      cp.status === 'validated' ? (theme === 'dark' ? "border-green-500/10 bg-zinc-900/40" : "border-green-100 bg-green-50/30") : 
                      (theme === 'dark' ? "border-white/5 bg-transparent opacity-40" : "border-gray-100 bg-white opacity-40")
                    )}
                  >
                    <div className={cn(
                      "absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 z-10 flex items-center justify-center shadow-lg",
                      cp.status === 'validated' ? "bg-green-500 border-green-500 text-black" : 
                      cp.status === 'active' ? "bg-primary border-primary animate-pulse" : (theme === 'dark' ? "bg-black border-white/20" : "bg-white border-gray-200")
                    )}>
                      {cp.status === 'validated' && <CheckCircle2 size={12} />}
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className={cn("text-xs font-black uppercase tracking-widest", theme === 'dark' ? "text-white" : "text-gray-900")}>{cp.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock size={10} className="text-gray-400" />
                          <p className="text-[9px] text-gray-400 font-black uppercase">{cp.time}</p>
                        </div>
                      </div>
                      {cp.status === 'active' && (
                         <div className="px-3 py-1 bg-primary text-[8px] font-black text-black uppercase rounded-full shadow-lg shadow-primary/20">
                            Actual
                         </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Tactical Footer Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-10">
              <Button variant="outline" className={cn(
                "h-14 rounded-2xl text-[10px] font-black tracking-widest uppercase border-2",
                theme === 'dark' ? "border-white/10 text-white hover:bg-white/5" : "border-gray-200 text-gray-700"
              )}>
                <ShieldAlert size={16} className="mr-2 text-primary" /> Reportar Incidencia
              </Button>
              <Button variant="ghost" className="h-14 text-red-500/70 text-[10px] font-black tracking-widest uppercase hover:text-red-500 hover:bg-red-50 rounded-2xl">
                 Abortar Patrulla
              </Button>
            </div>
          </div>
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

// Helper to detect mobile (SSR friendly)
function isMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 1024;
}
