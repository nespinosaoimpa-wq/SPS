'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  AlertTriangle, 
  RotateCw, 
  Ticket, 
  Activity,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

const TacticalMap = dynamic(() => import('@/components/TacticalMap'), { ssr: false });

const kpis = [
  { title: 'Personal Activo', value: '24/30', sub: '80% Capacidad', icon: Users, color: 'text-green-500' },
  { title: 'Alertas Activas', value: '03', sub: 'Crítico: 1', icon: AlertTriangle, color: 'text-red-500', pulse: true },
  { title: 'Rondines Hoy', value: '87%', sub: 'Meta: 90%', icon: RotateCw, color: 'text-primary' },
  { title: 'Tickets V.I.P.', value: '12', sub: 'Pendientes', icon: Ticket, color: 'text-amber-500' },
];

const recentActivity = [
  { time: '23:45:12', msg: 'Inicio de Rondín - Sector B', type: 'info', user: 'Op. Méndez' },
  { time: '23:40:05', msg: 'Acceso No Autorizado Detectado', type: 'alert', user: 'CAM-08' },
  { time: '23:35:20', msg: 'Reporte de Turno Entregado', type: 'success', user: 'Op. Ruiz' },
  { time: '23:30:11', msg: 'Móvil 02 en Posición', type: 'info', user: 'M-02 ALPHA' },
  { time: '23:25:00', msg: 'Sincronización de Biométrica', type: 'success', user: 'SPS-SRV' },
];

export default function GerenteDashboard() {
  const [data, setData] = React.useState<any>({ objectives: [], resources: [], recentIncidents: [] });
  const [loading, setLoading] = React.useState(true);

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

  return (
    <div className="space-y-8 pb-12">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] tracking-[0.2em]">{kpi.title}</CardTitle>
                <kpi.icon className={kpi.color} size={18} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-display tracking-tight flex items-baseline gap-2">
                  {kpi.value}
                  {kpi.pulse && (
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">{kpi.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Map Area */}
        <Card className="lg:col-span-2 min-h-[500px] flex flex-col relative overflow-hidden bg-black/50">
          <CardHeader className="absolute top-0 left-0 w-full z-10 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xs">Grilla Táctica Georeferenciada</CardTitle>
                <CardDescription className="text-[10px] uppercase font-mono mt-1">
                  COORD: 34.6037° S, 58.3816° W | SECTOR: SANTA FE CAPITAL
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="tactical" size="sm">Filtros Tácticos</Button>
                <Button variant="tactical" size="sm">Capas de Calor</Button>
              </div>
            </div>
          </CardHeader>
          
          {/* Modern Tactical Map */}
          <div className="flex-1 w-full bg-[#111]">
            <TacticalMap 
              objectives={data.objectives} 
              resources={data.resources}
              className="w-full h-full"
            />
          </div>
          
          <div className="absolute bottom-6 right-6 flex flex-col gap-2">
            <div className="p-3 bg-black/90 border border-primary/10 backdrop-blur-md">
              <p className="text-[10px] text-gray-500 uppercase mb-2">Leyenda de Comando</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span className="text-[9px] text-white uppercase">Personal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-[9px] text-white uppercase">Vehículos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[9px] text-white uppercase">Alerta Crítica</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Real-time Activity Feed */}
        <Card className="flex flex-col h-full overflow-hidden border-primary/5">
          <CardHeader className="border-b border-primary/10">
            <CardTitle className="text-xs flex items-center gap-2">
              <Activity size={14} className="text-primary" />
              Actividad en Tiempo Real
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-y-auto">
            {recentActivity.map((act, i) => (
              <div 
                key={i} 
                className="p-4 border-b border-primary/5 hover:bg-primary/5 transition-colors group cursor-default"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-mono text-gray-500">{act.time}</span>
                  <span className={cn(
                    "text-[8px] px-1.5 py-0.5 border uppercase font-bold",
                    act.type === 'alert' ? 'border-red-500 text-red-500' : 
                    act.type === 'success' ? 'border-green-500 text-green-500' : 
                    'border-primary/40 text-primary'
                  )}>
                    {act.type}
                  </span>
                </div>
                <p className="text-[11px] text-white leading-relaxed mb-1 font-medium">{act.msg}</p>
                <div className="flex justify-between items-center text-[9px] text-gray-500">
                  <span className="uppercase tracking-widest">{act.user}</span>
                  <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </CardContent>
          <div className="p-4 bg-black/20 text-center border-t border-primary/10">
            <button className="text-[10px] text-primary uppercase tracking-[0.2em] font-display hover:text-white transition-colors">
              Ver Historial Completo
            </button>
          </div>
        </Card>
      </div>

      {/* Critical Alert Bar */}
      <motion.div 
        animate={{ backgroundColor: ['rgba(255, 0, 0, 0.1)', 'rgba(255, 0, 0, 0.2)', 'rgba(255, 0, 0, 0.1)'] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="fixed bottom-0 left-64 right-0 h-10 bg-red-950/20 border-t border-red-500/50 flex items-center px-8 z-30 pointer-events-none"
      >
        <div className="flex items-center gap-4 text-[11px] font-bold text-red-500">
          <AlertTriangle size={14} className="animate-pulse" />
          <span className="uppercase tracking-[0.2em]">Atención: Alerta Crítica Detectada - Sector Norte - Perímetro A2</span>
          <div className="h-4 w-[1px] bg-red-500/30 ml-4" />
          <span className="text-white font-normal uppercase tracking-widest opacity-70">Personal de respuesta despachado</span>
        </div>
      </motion.div>
    </div>
  );
}
