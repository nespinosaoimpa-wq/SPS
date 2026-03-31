'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart, 
  Target, 
  Zap, 
  ShieldCheck, 
  AlertCircle,
  Clock,
  Map as MapIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const stats = [
  { label: 'Eficacia de Rondines', value: '94.2%', change: '+2.1%', up: true, icon: ShieldCheck },
  { label: 'Tiempo de Respuesta', value: '4m 12s', change: '-18s', up: true, icon: Zap },
  { label: 'Incidentes Críticos', value: '12', change: '-4', up: true, icon: AlertCircle },
  { label: 'Alertas Silenciosas', value: '45', change: '+8', up: false, icon: Target },
];

const months = ['OCT', 'NOV', 'DIC', 'ENE', 'FEB', 'MAR'];
const data = [45, 52, 38, 65, 48, 59];

export default function AnalisisPage() {
  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Análisis de Demanda</h1>
          <p className="text-xs text-primary uppercase font-display tracking-widest mt-1">Inteligencia Estratégica y Patrones de Vulnerabilidad</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">PDF REPORTE ANUAL</Button>
          <Button variant="tactical" size="sm">CONFIGURAR ALERTAS</Button>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <Card key={i} className="bg-secondary/40 border-primary/10">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-primary/10 border border-primary/20">
                  <s.icon className="text-primary" size={18} />
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-[10px] font-bold uppercase",
                  s.up ? "text-green-500" : "text-red-500"
                )}>
                  {s.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {s.change}
                </div>
              </div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{s.label}</p>
              <h3 className="text-2xl font-black text-white font-display uppercase tracking-tight">{s.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Demand Trend Chart Placeholder */}
        <Card className="lg:col-span-2 border-primary/10 bg-black/40">
          <CardHeader>
            <CardTitle className="text-xs flex items-center gap-2">
              <BarChart size={14} className="text-primary" />
              Tendencia de Anomalías (Últimos 6 Meses)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 h-[300px] flex items-end justify-between gap-4">
            {data.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                <div className="w-full bg-primary/5 border-x border-t border-primary/20 relative group-hover:bg-primary/20 transition-all" style={{ height: `${(val / 70) * 100}%` }}>
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: '100%' }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className="absolute bottom-0 left-0 w-full bg-primary/30"
                  />
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    <span className="text-[10px] font-mono text-primary font-bold">{val} ev.</span>
                  </div>
                </div>
                <span className="text-[10px] text-gray-500 font-display">{months[i]}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Highlighted Vulnerability Zones */}
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle className="text-xs text-red-500 flex items-center gap-2">
              <MapIcon size={14} /> 
              Zonas Silenciosas (Heatmap)
            </CardTitle>
            <CardDescription className="text-[9px] uppercase tracking-wider">Altas tasas de omisión en rondines detectada</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-square bg-[#111] relative border border-red-500/10 overflow-hidden">
               {/* Raster scan effect */}
               <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/5 to-transparent h-20 w-full animate-scan pointer-events-none" />
               <div className="absolute top-[20%] left-[30%] w-12 h-12 bg-red-600/30 blur-xl rounded-full animate-pulse" />
               <div className="absolute top-[60%] left-[70%] w-16 h-16 bg-red-600/20 blur-xl rounded-full" />
               
               <div className="absolute inset-0 p-4 flex flex-col justify-end">
                  <p className="text-[9px] text-red-500 uppercase font-black mb-1">¡ ALERTA DE PATERNAL !</p>
                  <p className="text-[8px] text-white opacity-60 uppercase">Sector: Depósito 02 / Perímetro SUR</p>
               </div>
            </div>
            <Button variant="outline" className="w-full text-[10px] h-10 border-red-500/50 text-red-500">AUTO-DESPACHAR RONDÍN DE REFUERZO</Button>
          </CardContent>
        </Card>
      </div>

      {/* Correlative Data Table */}
      <Card className="border-primary/10">
        <CardHeader className="border-b border-primary/10">
          <CardTitle className="text-xs uppercase">Correlación de Factores Externos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-primary/10">
             <div className="p-6">
                <p className="text-[10px] text-gray-500 uppercase mb-3">Factor Climático</p>
                <div className="flex items-center gap-4">
                   <div className="text-2xl font-bold font-display text-white">Lluvia</div>
                   <div className="text-xs text-red-500 font-bold">+15% Incidencia</div>
                </div>
             </div>
             <div className="p-6">
                <p className="text-[10px] text-gray-500 uppercase mb-3">Banda Horaria Crítica</p>
                <div className="flex items-center gap-4">
                   <div className="text-2xl font-bold font-display text-white font-mono">03:00 - 04:30</div>
                   <div className="text-xs text-primary font-bold">Max Vulnerabilidad</div>
                </div>
             </div>
             <div className="p-6">
                <p className="text-[10px] text-gray-500 uppercase mb-3">Personal de Servicio</p>
                <div className="flex items-center gap-4">
                   <div className="text-2xl font-bold font-display text-white">Turno Noche</div>
                   <div className="text-xs text-green-500 font-bold">100% Cobertura</div>
                </div>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Custom styles for scan line animation
const styles = `
@keyframes scan {
  from { top: -20%; }
  to { top: 100%; }
}
.animate-scan {
  animation: scan 3s linear infinite;
}
`;

// Reuse cn
function cn(...inputs: string[]) {
  return inputs.filter(Boolean).join(' ');
}
