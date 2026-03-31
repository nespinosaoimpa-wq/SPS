'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  RotateCw, 
  Navigation,
  ShieldCheck,
  Clock, 
  CheckCircle2, 
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { QRScanner } from '@/components/ui/QRScanner';

const checkpoints = [
  { id: 1, name: 'Portón Principal A1', status: 'validated', time: '14:20' },
  { id: 2, name: 'Depósito de Insumos', status: 'validated', time: '14:35' },
  { id: 3, name: 'Perímetro Norte - Punto 4', status: 'active', time: 'En proceso' },
  { id: 4, name: 'Salida de Emergencia 2', status: 'pending', time: '--:--' },
  { id: 5, name: 'Generadores Eléctricos', status: 'pending', time: '--:--' },
];

export default function RondinesPage() {
  const [showScanner, setShowScanner] = React.useState(false);
  const [validating, setValidating] = React.useState(false);

  const handleValidationClick = () => {
    setShowScanner(true);
  };

  const handleScanSuccess = async (qrData: string) => {
    setShowScanner(false);
    setValidating(true);
    // Simulate API call to /api/patrols/checkpoint
    setTimeout(() => {
      setValidating(false);
    }, 1500);
  };

  return (
    <div className="p-6 space-y-6 pb-32">
      {/* Active Patrol Stats */}
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-[10px] text-primary uppercase tracking-widest mb-1 italic">Rondín en Curso</p>
              <h1 className="text-2xl font-bold font-display uppercase tracking-tight">Perímetro Externo</h1>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Progreso</p>
              <p className="text-xl font-black text-primary font-mono">2 / 5</p>
            </div>
          </div>

          {/* Tactical Progress Bar */}
          <div className="h-2 w-full bg-black/40 border border-primary/10 mb-4 overflow-hidden relative">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '40%' }}
              className="h-full bg-primary"
            />
            {/* Visual segments */}
            <div className="absolute inset-0 flex">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex-1 border-r border-black/20 last:border-none" />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[9px] text-gray-500 uppercase tracking-widest font-display">
            <Clock size={12} className="text-primary" /> 
            Tiempo estimado restante: <span className="text-white font-bold ml-1">18 min</span>
          </div>
        </CardContent>
      </Card>

      {/* Geofence Alert / Validator */}
      <motion.div
        animate={{ 
          borderColor: ['rgba(255,215,0,0.1)', 'rgba(255,215,0,0.4)', 'rgba(255,215,0,0.1)'],
          backgroundColor: ['rgba(255,215,0,0.02)', 'rgba(255,215,0,0.05)', 'rgba(255,215,0,0.02)']
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="p-6 border-2 border-dashed rounded-sm text-center space-y-4"
      >
        <div className="flex justify-center mb-2">
           <div className="relative">
              <Navigation size={32} className="text-primary animate-bounce" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-primary/20 blur-xl rounded-full" />
           </div>
        </div>
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-tighter">Punto de Control Detectado</h3>
          <p className="text-[10px] text-primary uppercase font-display mt-1">Usted está dentro del Geofence: Perímetro Norte - Punto 4</p>
        </div>
        <Button 
          className="w-full h-14 text-base font-black shadow-lg shadow-primary/20 uppercase tracking-widest"
          onClick={handleValidationClick}
          disabled={validating}
        >
           <ShieldCheck className="mr-2" /> {validating ? 'VALIDANDO...' : 'VALIDAR CON QR'}
        </Button>
      </motion.div>

      {showScanner && (
        <QRScanner 
          onScan={handleScanSuccess}
          onCancel={() => setShowScanner(false)}
        />
      )}

      {/* Checkpoint List */}
      <div className="space-y-4">
        <h3 className="text-xs font-display text-gray-500 uppercase tracking-widest px-1">Checkpoints del Recorrido</h3>
        <div className="space-y-2">
          {checkpoints.map((cp, i) => (
            <Card key={cp.id} className={cn(
              "border-primary/5 transition-all overflow-hidden",
              cp.status === 'active' ? "border-primary/40 bg-primary/5" : "bg-secondary/40"
            )}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-sm text-xs font-bold",
                    cp.status === 'validated' ? "bg-green-500/10 text-green-500" : 
                    cp.status === 'active' ? "bg-primary text-black" : "bg-black/40 text-gray-600 border border-primary/5"
                  )}>
                    {cp.status === 'validated' ? <CheckCircle2 size={16} /> : cp.id}
                  </div>
                  <div>
                    <h4 className={cn(
                      "text-xs font-bold uppercase tracking-tight",
                      cp.status === 'pending' ? "text-gray-600" : "text-white"
                    )}>
                      {cp.name}
                    </h4>
                    <p className="text-[9px] text-gray-500 uppercase font-mono">{cp.time}</p>
                  </div>
                </div>
                {cp.status === 'active' && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-primary font-black uppercase animate-pulse">ACTUAL</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Manual Action Footer */}
      <div className="text-center pt-4">
        <button className="text-[10px] text-red-500 uppercase tracking-widest font-display flex items-center gap-2 mx-auto hover:text-red-400">
          <AlertTriangle size={12} /> Abortar Rondín por Anomalía Crítica
        </button>
      </div>
    </div>
  );
}

// Reuse cn
function cn(...inputs: string[]) {
  return inputs.filter(Boolean).join(' ');
}
