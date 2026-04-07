'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  AlertTriangle, 
  RotateCw, 
  Activity,
  ChevronRight,
  Radio,
  Siren,
  ShieldAlert,
  Search,
  ScanEye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { StatsChart } from '@/components/gerente/StatsChart';

const TacticalMap = dynamic(() => import('@/components/TacticalMap'), { ssr: false });

const mockRondinesData = [
  { time: '00:00', value: 85 }, { time: '04:00', value: 70 },
  { time: '08:00', value: 95 }, { time: '12:00', value: 90 },
  { time: '16:00', value: 88 }, { time: '20:00', value: 92 },
  { time: '24:00', value: 89 },
];

const mockAlertsData = [
  { time: 'Lun', qty: 12 }, { time: 'Mar', qty: 8 },
  { time: 'Mie', qty: 15 }, { time: 'Jue', qty: 7 },
  { time: 'Vie', qty: 22 }, { time: 'Sab', qty: 30 },
  { time: 'Dom', qty: 25 },
];

const activeOperators = [
  { id: 'OP-04A', name: 'J. Méndez', status: 'active', lastPing: 'Hace 5s', location: 'Portón Norte' },
  { id: 'OP-02B', name: 'M. Ruiz', status: 'active', lastPing: 'Hace 12s', location: 'Perímetro 2' },
  { id: 'OP-11C', name: 'F. López', status: 'warning', lastPing: 'Hace 4m', location: 'Subsuelo B' },
  { id: 'OP-08D', name: 'A. Silva', status: 'offline', lastPing: 'Hace 15m', location: 'Desconocido' },
];

export default function GerenteDashboardOCC() {
  const [data, setData] = useState<any>({ objectives: [], resources: [], recentIncidents: [] });
  const [loading, setLoading] = useState(true);
  const [dispatchMode, setDispatchMode] = useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.dashboard.getMapData();
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Subscribe to real-time updates for resources
    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, (payload) => {
        const newData = payload.new as any;
        setData((prev: any) => ({
          ...prev,
          resources: prev.resources.map((r: any) => r.id === newData.id ? newData : r)
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const triggerDispatch = () => {
    setDispatchMode(true);
    setTimeout(() => {
      alert("Alerta general emitida a todos los dispositivos en terreno.");
      setDispatchMode(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4 pb-4">
      
      {/* Top Bar: Critical Stats */}
      <div className="grid grid-cols-4 gap-4 h-24">
        <Card className="bg-surface/40 hover:bg-surface/60 transition-colors border-primary/20 flex items-center justify-between p-6">
          <div>
            <p className="text-[10px] uppercase text-gray-400 tracking-widest font-display mb-1">Carga Operativa</p>
            <h3 className="text-3xl font-black text-white leading-none">85<span className="text-sm text-gray-500">%</span></h3>
          </div>
          <Activity className="text-primary w-8 h-8 opacity-50" />
        </Card>

        <Card className="bg-surface/40 hover:bg-surface/60 transition-colors border-red-500/20 flex items-center justify-between p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors" />
          <div className="relative z-10">
            <p className="text-[10px] uppercase text-red-400 tracking-widest font-display mb-1">Total Alertas (24h)</p>
            <h3 className="text-3xl font-black text-white leading-none">12</h3>
          </div>
          <AlertTriangle className="text-red-500 w-8 h-8 relative z-10" />
        </Card>

        <Card className="col-span-2 bg-surface/40 border-primary/10 overflow-hidden flex">
          <div className="w-1/2 p-4 border-r border-primary/10">
            <StatsChart 
              data={mockRondinesData} 
              xDataKey="time" 
              yDataKey="value" 
              type="area" 
              title="Eficiencia de Rondines" 
              color="#3b82f6" 
              valueFormatter={(v) => `${v}%`}
            />
          </div>
          <div className="w-1/2 p-4">
            <StatsChart 
              data={mockAlertsData} 
              xDataKey="time" 
              yDataKey="qty" 
              type="bar" 
              title="Incidentes por Día" 
              color="#ef4444" 
            />
          </div>
        </Card>
      </div>

      {/* Main Command Grid */}
      <div className="flex-1 grid grid-cols-12 gap-4 h-full min-h-0">
        
        {/* Left Column: Personnel & Man Alive */}
        <div className="col-span-3 flex flex-col gap-4 overflow-y-auto">
          <Card className="flex-1 border-primary/20 bg-black/40 flex flex-col">
            <CardHeader className="py-4 border-b border-primary/10 bg-surface/50">
              <CardTitle className="text-xs flex items-center gap-2">
                <ScanEye size={14} className="text-primary" />
                Control de Presencia
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
              <div className="p-3 text-[10px] bg-primary/10 text-primary border-b border-primary/20 text-center uppercase tracking-widest font-bold">
                Módulo Man Alive
              </div>
              <div className="flex flex-col">
                {activeOperators.map((op, i) => (
                  <div key={i} className="flex flex-col p-3 border-b border-white/5 hover:bg-white/5 transition-colors">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold font-mono text-white">{op.id}</span>
                      <div className="flex items-center gap-1.5">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          op.status === 'active' ? 'bg-green-500 animate-pulse' : 
                          op.status === 'warning' ? 'bg-amber-500' : 'bg-gray-600'
                        )} />
                        <span className="text-[9px] uppercase tracking-wider text-gray-400">{op.status}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] mt-1">
                      <span className="text-gray-400">{op.name}</span>
                      <span className={cn(
                        "font-bold",
                        op.status === 'offline' ? 'text-red-400' : 'text-primary'
                      )}>{op.lastPing}</span>
                    </div>
                    <span className="text-[9px] text-gray-500 uppercase mt-1 line-clamp-1">{op.location}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center Column: Tactical Map & Dispatch */}
        <div className="col-span-6 flex flex-col gap-4">
          <Card className="flex-1 relative overflow-hidden border-primary/30">
            <div className="absolute inset-0 z-0">
              <TacticalMap 
                objectives={data.objectives} 
                resources={data.resources}
                className="w-full h-full"
              />
            </div>
            
            {/* Map Accents */}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <div className="px-3 py-1.5 bg-black/80 border border-primary/30 backdrop-blur-md rounded-sm text-[10px] font-mono text-primary uppercase flex items-center gap-2 shadow-lg">
                <Radio size={12} className="animate-pulse" /> Sector Capital
              </div>
            </div>

            <div className="absolute bottom-4 left-4 right-4 z-10">
              <AnimatePresence>
                {dispatchMode ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 bg-red-950/90 border border-red-500/50 backdrop-blur-xl rounded-md w-full flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 text-red-500">
                      <Siren className="animate-spin-slow" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest">Transmitiendo Alerta General...</p>
                        <p className="text-[9px] opacity-80 uppercase mt-0.5">Contactando a 24/24 unidades en terreno</p>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-white/50">ESPERANDO ACUSE_RECIbo</div>
                  </motion.div>
                ) : (
                  <Card className="bg-black/80 border-primary/20 backdrop-blur-md p-2 flex gap-2 shadow-2xl">
                    <Button 
                      variant="destructive" 
                      className="h-10 text-xs font-bold tracking-widest uppercase flex-1 border-none shadow-lg shadow-red-900/20"
                      onClick={triggerDispatch}
                    >
                      <ShieldAlert className="mr-2 w-4 h-4" /> Despacho de Emergencia
                    </Button>
                    <Button variant="tactical" className="h-10 px-8 text-xs">
                      Auditoría
                    </Button>
                  </Card>
                )}
              </AnimatePresence>
            </div>
          </Card>
        </div>

        {/* Right Column: Intelligent Feed */}
        <div className="col-span-3 flex flex-col gap-4">
          <Card className="flex-1 border-primary/20 bg-black/40 flex flex-col">
            <CardHeader className="py-4 border-b border-primary/10 bg-surface/50 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-display tracking-widest uppercase flex items-center gap-2">
                Log Operativo
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-primary">
                <Search size={12} />
              </Button>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
              <div className="flex flex-col">
                {[
                  { time: '14:23:01', id: 'EVT-0912', type: 'info', msg: 'Rondín completado 100%', context: 'Sector Norte' },
                  { time: '14:21:45', id: 'EVT-0911', type: 'warning', msg: 'Demora en reporte Man Alive', context: 'OP-11C' },
                  { time: '14:15:33', id: 'EVT-0910', type: 'alert', msg: 'Botón de pánico presionado', context: 'OP-02B' },
                  { time: '14:10:00', id: 'EVT-0909', type: 'info', msg: 'Cambio de turno registrado', context: 'Central' },
                  { time: '13:55:12', id: 'EVT-0908', type: 'info', msg: 'Vehículo VIP detectado', context: 'Acceso 1' },
                ].map((log, i) => (
                  <div key={i} className="p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer group">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[9px] font-mono text-gray-500">{log.time}</span>
                      <span className={cn(
                        "text-[8px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-sm bg-black border",
                        log.type === 'alert' ? 'border-red-500 text-red-500' :
                        log.type === 'warning' ? 'border-amber-500 text-amber-500' :
                        'border-primary/30 text-primary'
                      )}>
                        {log.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-white font-medium mb-1 line-clamp-2">{log.msg}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[9px] text-gray-500 uppercase">{log.context}</span>
                      <ChevronRight size={10} className="text-gray-600 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
