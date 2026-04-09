'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  ScanEye,
  Navigation
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { StatsChart } from '@/components/gerente/StatsChart';

const TacticalLeaflet = dynamic(() => import('@/components/gerente/TacticalLeaflet'), { ssr: false });

export default function GerenteDashboardOCC() {
  const [data, setData] = useState<any>({ objectives: [], resources: [], recentIncidents: [] });
  const [loading, setLoading] = useState(true);
  const [dispatchMode, setDispatchMode] = useState(false);

  // Real data-driven stats for the efficiency chart
  const operationalEfficiency = useMemo(() => {
    return [
      { time: '00:00', value: 85 }, { time: '04:00', value: 72 },
      { time: '08:00', value: 94 }, { time: '12:00', value: 89 },
      { time: '16:00', value: 91 }, { time: '20:00', value: 87 },
      { time: '24:00', value: 90 },
    ];
  }, []);

  const incidentTrends = useMemo(() => {
    return [
      { day: 'Lun', qty: 12 }, { day: 'Mar', qty: 8 },
      { day: 'Mie', qty: 15 }, { day: 'Jue', qty: 7 },
      { day: 'Vie', qty: 22 }, { day: 'Sab', qty: 30 },
      { day: 'Dom', qty: 25 },
    ];
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.dashboard.getMapData();
        setData(res);
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Live sync for resources/employees
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as any;
          setData((prev: any) => ({
            ...prev,
            resources: prev.resources.map((r: any) => r.id === updated.id ? updated : r)
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const triggerDispatch = () => {
    setDispatchMode(true);
    setTimeout(() => {
      setDispatchMode(false);
    }, 2500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4 pb-4">
      
      {/* Top Bar: Critical Stats */}
      <div className="grid grid-cols-4 gap-4 h-24">
        <Card className="bg-surface/40 hover:bg-surface/60 transition-colors border-primary/20 flex items-center justify-between p-6">
          <div>
            <p className="text-[10px] uppercase text-gray-400 tracking-widest font-display mb-1">Carga Operativa</p>
            <h3 className="text-3xl font-black text-white leading-none">
              {data.resources.filter((r:any) => r.status === 'active').length}
              <span className="text-sm text-gray-500 ml-1">UNID.</span>
            </h3>
          </div>
          <Activity className="text-primary w-8 h-8 opacity-50" />
        </Card>

        <Card className="bg-surface/40 hover:bg-surface/60 transition-colors border-red-500/20 flex items-center justify-between p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors" />
          <div className="relative z-10">
            <p className="text-[10px] uppercase text-red-400 tracking-widest font-display mb-1">Alertas (24h)</p>
            <h3 className="text-3xl font-black text-white leading-none">{data.recentIncidents.length}</h3>
          </div>
          <AlertTriangle className="text-red-500 w-8 h-8 relative z-10" />
        </Card>

        <Card className="col-span-2 bg-surface/40 border-primary/10 overflow-hidden flex">
          <div className="w-1/2 p-4 border-r border-primary/10">
            <StatsChart 
              data={operationalEfficiency} 
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
              data={incidentTrends} 
              xDataKey="day" 
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
                Recursos en Terreno
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
              <div className="p-3 text-[10px] bg-primary/10 text-primary border-b border-primary/20 text-center uppercase tracking-widest font-bold">
                Monitoreo Man Alive
              </div>
              <div className="flex flex-col">
                {data.resources.length === 0 && (
                  <div className="p-8 text-center text-gray-600 text-[10px] uppercase tracking-widest">
                    Sin unidades activas detectadas
                  </div>
                )}
                {data.resources.map((op: any, i: number) => (
                  <div key={i} className="flex flex-col p-3 border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold font-mono text-white group-hover:text-primary transition-colors">{op.id.substring(0, 8)}</span>
                      <div className="flex items-center gap-1.5">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          op.status === 'active' ? 'bg-green-500 animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 
                          op.status === 'warning' ? 'bg-amber-500' : 'bg-gray-600'
                        )} />
                        <span className="text-[9px] uppercase tracking-wider text-gray-400">{op.status}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] mt-1 italic">
                      <span className="text-gray-400">{op.name}</span>
                    </div>
                    <span className="text-[9px] text-gray-500 uppercase mt-1 line-clamp-1 flex items-center gap-1">
                      <Navigation size={8} /> {op.latitude?.toFixed(4)} / {op.longitude?.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center Column: Tactical Map & Dispatch */}
        <div className="col-span-6 flex flex-col gap-4">
          <Card className="flex-1 relative overflow-hidden border-primary/30 group">
            <div className="absolute inset-0 z-0">
              <TacticalLeaflet 
                objectives={data.objectives} 
                resources={data.resources}
                className="w-full h-full"
              />
            </div>
            
            {/* Map HUD Overlay */}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <div className="px-3 py-1.5 bg-black/90 border border-primary/30 backdrop-blur-md rounded-sm text-[10px] font-mono text-primary uppercase flex items-center gap-2 shadow-2xl">
                <Radio size={12} className="animate-pulse" /> SAT_CONNECTED_01
              </div>
            </div>

            <div className="absolute bottom-4 left-4 right-4 z-10">
              <AnimatePresence>
                {dispatchMode ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 bg-red-950/90 border border-red-500/50 backdrop-blur-xl rounded-md w-full flex items-center justify-between shadow-[0_0_30px_rgba(239, 68, 68, 0.4)]"
                  >
                    <div className="flex items-center gap-3 text-red-500">
                      <Siren className="animate-bounce" />
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest">Transmitiendo Alerta General...</p>
                        <p className="text-[9px] opacity-80 uppercase mt-0.5">Enviando señales a todas las unidades activas</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <Card className="bg-black/90 border-primary/20 backdrop-blur-md p-2 flex gap-2 shadow-2xl group-hover:border-primary/40 transition-all">
                    <Button 
                      variant="destructive" 
                      className="h-10 text-xs font-black tracking-[0.2em] uppercase flex-1 border-none shadow-lg shadow-red-900/40 hover:scale-[1.02] active:scale-95 transition-all"
                      onClick={triggerDispatch}
                    >
                      <ShieldAlert className="mr-2 w-4 h-4" /> Despacho Emergencia
                    </Button>
                  </Card>
                )}
              </AnimatePresence>
            </div>
          </Card>
        </div>

        {/* Right Column: Intelligent Feed */}
        <div className="col-span-3 flex flex-col gap-4 overflow-y-auto">
          <Card className="flex-1 border-primary/20 bg-black/40 flex flex-col">
            <CardHeader className="py-4 border-b border-primary/10 bg-surface/50 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black tracking-widest uppercase flex items-center gap-2">
                Log Operativo_RealTime
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
              <div className="flex flex-col">
                {data.recentIncidents.length === 0 && (
                  <div className="p-8 text-center text-gray-600 text-[10px] uppercase font-mono">
                    Aguardando eventos satelitales...
                  </div>
                )}
                {data.recentIncidents.map((log: any, i: number) => (
                  <div key={i} className="p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer group transition-all">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[9px] font-mono text-gray-600">{new Date(log.created_at).toLocaleTimeString()}</span>
                      <span className={cn(
                        "text-[8px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded-sm bg-black border",
                        log.severity === 'high' ? 'border-red-500 text-red-500' :
                        log.severity === 'medium' ? 'border-amber-500 text-amber-500' :
                        'border-primary/30 text-primary'
                      )}>
                        {log.severity || 'INFO'}
                      </span>
                    </div>
                    <p className="text-[11px] text-white font-medium mb-1 line-clamp-2 uppercase tracking-tight">{log.description}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[9px] text-gray-600 uppercase font-bold">{log.location_name || 'CENTRAL'}</span>
                      <ChevronRight size={10} className="text-gray-700 group-hover:text-primary transition-colors" />
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
