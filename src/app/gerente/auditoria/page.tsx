'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ClipboardList, 
  Download, 
  Calendar, 
  TrendingUp, 
  Target, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  User,
  ArrowRight,
  ChevronRight,
  Search,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { StatsChart } from '@/components/gerente/StatsChart';

const mockCommercialData = [
  { id: 'OBJ-101', name: 'Plaza de Mayo (Custodia)', contracted: 720, worked: 685, status: 'warning', revenue: 1450000, personnel: 12 },
  { id: 'OBJ-102', name: 'Puerto Madero - Torre 1', contracted: 2400, worked: 2412, status: 'ok', revenue: 4800000, personnel: 24 },
  { id: 'OBJ-103', name: 'Almacén Central Norte', contracted: 1440, worked: 1210, status: 'critical', revenue: 2900000, personnel: 18 },
  { id: 'OBJ-104', name: 'Barrio Cerrado San Jorge', contracted: 4320, worked: 4320, status: 'ok', revenue: 8640000, personnel: 32 },
];

const mockTrends = [
  { month: 'Ene', hours: 12400 },
  { month: 'Feb', hours: 11800 },
  { month: 'Mar', hours: 13500 },
  { month: 'Abr', hours: 14200 },
  { month: 'May', hours: 13900 },
];

export default function AuditoriaComercial() {
  const [period, setPeriod] = useState('Marzo 2026');

  const totals = useMemo(() => {
    const contracted = mockCommercialData.reduce((acc, curr) => acc + curr.contracted, 0);
    const worked = mockCommercialData.reduce((acc, curr) => acc + curr.worked, 0);
    const revenue = mockCommercialData.reduce((acc, curr) => acc + curr.revenue, 0);
    return { contracted, worked, revenue, efficiency: (worked / contracted) * 100 };
  }, []);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">Auditoría Operativa y Comercial</h1>
          <p className="text-xs text-primary uppercase font-display tracking-[0.3em] mt-2 italic">Control de Cumplimiento de Horas y Métricas de Facturación</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-zinc-950 border border-white/5 rounded-sm p-1 flex">
             <Button variant="ghost" size="sm" className="text-[9px] h-8 tracking-widest uppercase">MARZO</Button>
             <Button variant="tactical" size="sm" className="text-[9px] h-8 tracking-widest uppercase">ABRIL</Button>
          </div>
          <Button variant="outline" size="sm" className="gap-2 border-primary/20 text-gray-300">
            <Download size={14} /> EXPORTAR PARA LIQUIDACIÓN
          </Button>
        </div>
      </div>

      {/* High-Level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Ingreso Estimado (Período)', value: `$${(totals.revenue / 1000000).toFixed(1)}M`, icon: DollarSign, color: 'text-green-500' },
          { label: 'Eficiencia de Cumplimiento', value: `${totals.efficiency.toFixed(1)}%`, icon: Target, color: 'text-primary' },
          { label: 'Horas Totales Servidas', value: `${totals.worked}h`, icon: Clock, color: 'text-blue-500' },
          { label: 'Gaps de Servicio', value: '12', icon: AlertCircle, color: 'text-red-500' },
        ].map((stat, i) => (
          <Card key={i} className="bg-secondary/40 border-white/5 p-6 relative group overflow-hidden">
            <div className="absolute -bottom-4 -right-4 text-white/5 group-hover:text-primary/5 transition-colors">
               <stat.icon size={80} />
            </div>
            <p className="text-[10px] uppercase text-gray-500 tracking-widest mb-2 font-display">{stat.label}</p>
            <h3 className={cn("text-3xl font-black leading-none", stat.color)}>{stat.value}</h3>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Hour Consumption Trend */}
        <Card className="lg:col-span-1 bg-black/40 border-primary/10 p-6 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black uppercase text-white tracking-widest mb-6 flex items-center gap-2">
              <TrendingUp size={14} className="text-primary" /> Curva de Carga Operativa
            </h4>
            <div className="h-64">
              <StatsChart 
                data={mockTrends} 
                xDataKey="month" 
                yDataKey="hours" 
                type="area" 
                color="#3b82f6" 
              />
            </div>
          </div>
          <div className="mt-6 p-4 bg-primary/5 border border-primary/10 rounded-sm">
             <p className="text-[10px] text-primary uppercase font-bold mb-1">Diagnóstico Empresarial</p>
             <p className="text-[10px] text-gray-400 leading-snug uppercase">Incremento del 12% en requisiciones nocturnas. Se recomienda optimizar turnos 12x36.</p>
          </div>
        </Card>

        {/* Right: Client Fulfillment Matrix */}
        <Card className="lg:col-span-2 border-primary/10 bg-black/40 overflow-hidden">
          <CardHeader className="bg-zinc-900/50 border-b border-white/5 py-4 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-white">Cumplimiento por Objetivo (Cliente)</CardTitle>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input placeholder="Filtrar cliente..." className="pl-10 h-8 bg-black/40 border border-white/10 text-[9px] uppercase text-white w-48 rounded-sm focus:outline-none focus:border-primary/40" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-black/60 border-b border-white/10">
                  <th className="p-4 text-[9px] text-gray-500 uppercase font-black pl-8">Objetivo / ID</th>
                  <th className="p-4 text-[9px] text-gray-500 uppercase font-black">Planificado</th>
                  <th className="p-4 text-[9px] text-gray-500 uppercase font-black">Real Ejecutado</th>
                  <th className="p-4 text-[9px] text-gray-500 uppercase font-black">Desvío</th>
                  <th className="p-4 text-[9px] text-gray-500 uppercase font-black text-right pr-8">Auditoría</th>
                </tr>
              </thead>
              <tbody>
                {mockCommercialData.map((obj, i) => (
                  <tr key={obj.id} className="border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer group">
                    <td className="p-4 pl-8">
                       <p className="text-sm font-bold text-white uppercase group-hover:text-primary transition-all">{obj.name}</p>
                       <p className="text-[8px] text-gray-500 font-mono tracking-widest italic">{obj.id}</p>
                    </td>
                    <td className="p-4">
                       <span className="text-xs font-mono text-gray-400">{obj.contracted}h</span>
                    </td>
                    <td className="p-4">
                       <span className={cn(
                         "text-xs font-mono font-bold",
                         obj.worked < obj.contracted ? "text-amber-500" : "text-green-500"
                       )}>{obj.worked}h</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                         <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full", obj.status === 'ok' ? "bg-green-500" : obj.status === 'warning' ? "bg-amber-500" : "bg-red-500")}
                              style={{ width: `${(obj.worked / obj.contracted) * 100}%` }}
                            />
                         </div>
                         <span className="text-[9px] font-mono text-gray-500">{((obj.worked / obj.contracted) * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="p-4 text-right pr-8">
                       <div className="flex justify-end items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-7 text-[8px] uppercase tracking-widest text-gray-500 hover:text-primary">Detalle de Turnos <ArrowRight size={10} className="ml-1" /></Button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
          <div className="p-4 bg-zinc-900/30 text-center">
             <button className="text-[10px] text-primary uppercase font-bold tracking-[0.2em] hover:underline">Ver reporte de nómina consolidado</button>
          </div>
        </Card>
      </div>

    </div>
  );
}
