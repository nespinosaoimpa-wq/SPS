'use client';

import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Printer, 
  ChevronDown, 
  Calendar,
  User,
  ShieldAlert,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const mockAuditData = [
  { id: 'ACT-9021', date: '30 MAR 2026', time: '22:15', type: 'Rondín', user: 'Op. Méndez', target: 'Depósito Norte', status: 'Completado' },
  { id: 'ACT-9020', date: '30 MAR 2026', time: '21:00', type: 'Incidente', user: 'Op. Ruiz', target: 'Puesto 1', status: 'Crítico', alert: true },
  { id: 'ACT-9019', date: '30 MAR 2026', time: '19:45', type: 'Check-in', user: 'Op. Gómez', target: 'SPS Central', status: 'Validado' },
  { id: 'ACT-9018', date: '29 MAR 2026', time: '18:30', type: 'Rondín', user: 'Op. Méndez', target: 'Perímetro A', status: 'Completado' },
  { id: 'ACT-9017', date: '29 MAR 2026', time: '16:00', type: 'Judicial', user: 'Adm. Admin', target: 'Cámaras Sector 4', status: 'Congelado' },
];

export default function AuditoriaPage() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Módulo de Auditoría</h1>
          <p className="text-xs text-primary uppercase font-display tracking-widest mt-1">Histórico de Actuaciones Operativas - Últimos 12 Meses</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <Download size={14} /> EXPORTAR CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Printer size={14} /> IMPRIMIR ACTA
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="bg-secondary/50 border-primary/10">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input 
              placeholder="BUSCAR ID, USUARIO O LUGAR..." 
              className="pl-10 text-[10px] uppercase h-10 bg-black/30"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <select className="w-full h-10 bg-black/30 border border-primary/30 pl-10 pr-4 text-[10px] text-white uppercase font-display appearance-none">
              <option>ÚLTIMAS 24 HORAS</option>
              <option>ÚLTIMOS 7 DÍAS</option>
              <option>ÚLTIMO MES</option>
              <option>RANGO PERSONALIZADO</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <select className="w-full h-10 bg-black/30 border border-primary/30 pl-10 pr-4 text-[10px] text-white uppercase font-display appearance-none">
              <option>TODOS LOS EVENTOS</option>
              <option>INCIDENTES CRÍTICOS</option>
              <option>RONDINES</option>
              <option>PROTOCOLOS JUDICIALES</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
          </div>

          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <select className="w-full h-10 bg-black/30 border border-primary/30 pl-10 pr-4 text-[10px] text-white uppercase font-display appearance-none">
              <option>TODOS LOS OPERADORES</option>
              <option>OP. MÉNDEZ</option>
              <option>OP. RUIZ</option>
              <option>ADM. ADMIN</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
          </div>
        </CardContent>
      </Card>

      {/* Audit Table */}
      <Card className="border-primary/10 overflow-hidden">
        <CardContent className="p-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/80 border-b border-primary/20">
                <th className="p-4 text-[10px] text-primary uppercase font-display font-black tracking-widest">ID GESTIÓN</th>
                <th className="p-4 text-[10px] text-primary uppercase font-display font-black tracking-widest">FECHA / HORA</th>
                <th className="p-4 text-[10px] text-primary uppercase font-display font-black tracking-widest">TIPO DE EVENTO</th>
                <th className="p-4 text-[10px] text-primary uppercase font-display font-black tracking-widest">PERSONAL</th>
                <th className="p-4 text-[10px] text-primary uppercase font-display font-black tracking-widest">OBJETIVO TÁCTICO</th>
                <th className="p-4 text-[10px] text-primary uppercase font-display font-black tracking-widest text-right">ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {mockAuditData.map((row, i) => (
                <tr key={i} className="border-b border-primary/5 hover:bg-primary/5 transition-colors group cursor-default">
                  <td className="p-4">
                    <span className="text-xs font-mono text-gray-400 group-hover:text-primary transition-colors">{row.id}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">{row.date}</span>
                      <span className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                        <Clock size={10} /> {row.time}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                       {row.type === 'Incidente' ? <ShieldAlert size={14} className="text-red-500" /> : <CheckCircle2 size={14} className="text-primary" />}
                       <span className="text-xs font-bold text-white uppercase">{row.type}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-xs text-gray-300 uppercase tracking-wider">{row.user}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-xs text-gray-300 uppercase italic">{row.target}</span>
                  </td>
                  <td className="p-4 text-right">
                    <span className={cn(
                      "text-[9px] px-2 py-1 border font-black uppercase tracking-widest",
                      row.alert ? "border-red-500 text-red-500 bg-red-500/10" : "border-primary/40 text-primary bg-primary/5"
                    )}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pagination Placeholder */}
      <div className="flex justify-between items-center py-4">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest italic">Mostrando 5 de 1,245 registros auditados bajo protocolo SPS-9000-AR</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>ANTERIOR</Button>
          <Button variant="outline" size="sm">SIGUIENTE</Button>
        </div>
      </div>
    </div>
  );
}

// Reuse cn
function cn(...inputs: string[]) {
  return inputs.filter(Boolean).join(' ');
}
