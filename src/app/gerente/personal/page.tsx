'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  ChevronRight, 
  MoreVertical, 
  ShieldCheck, 
  AlertCircle, 
  Clock,
  IdCard,
  Briefcase,
  FileBadge
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

const mockStaff = [
  { id: 'S-701', name: 'Carlos Méndez', role: 'Vigilante Principal', status: 'Activo', documentStatus: { psych: 'valid', license: 'valid', uniform: 'valid' }, hoursMonthly: 168 },
  { id: 'S-702', name: 'Marta Ruiz', role: 'Supervisora de Zona', status: 'Activo', documentStatus: { psych: 'valid', license: 'warning', uniform: 'valid' }, hoursMonthly: 184 },
  { id: 'S-703', name: 'Jorge López', role: 'Vigilante Subsuelo', status: 'Licencia', documentStatus: { psych: 'expired', license: 'valid', uniform: 'pending' }, hoursMonthly: 45 },
  { id: 'S-704', name: 'Ana Silva', role: 'Custodia VIP', status: 'Activo', documentStatus: { psych: 'valid', license: 'valid', uniform: 'valid' }, hoursMonthly: 172 },
  { id: 'S-705', name: 'Pedro Gómez', role: 'Operador Central', status: 'Suspendido', documentStatus: { psych: 'warning', license: 'expired', uniform: 'valid' }, hoursMonthly: 0 },
];

export default function PersonalHub() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6 pb-12">
      
      {/* Page Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">Gestión de Personal</h1>
          <p className="text-xs text-primary uppercase font-display tracking-[0.3em] mt-2 italic">Control de Legajos y Actuaciones del Capital Humano</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="gap-2 border-primary/20 text-gray-400">
            <Download size={14} /> EXPORTAR ROSTER
          </Button>
          <Button variant="tactical" size="sm" className="gap-2">
            <Plus size={14} /> ALTA DE PERSONAL
          </Button>
        </div>
      </div>

      {/* Tactical Stats HUD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Efectivos', value: '124', icon: Users, color: 'text-primary' },
          { label: 'En Servicio (Ahora)', value: '42', icon: ShieldCheck, color: 'text-green-500' },
          { label: 'Alertas de Documentación', value: '08', icon: AlertCircle, color: 'text-red-500' },
          { label: 'Horas Totales (Mes)', value: '18.4k', icon: Clock, color: 'text-blue-500' },
        ].map((stat, i) => (
          <Card key={i} className="bg-secondary/40 border-white/5 hover:border-primary/20 transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <stat.icon size={48} />
            </div>
            <CardContent className="p-6">
              <p className="text-[10px] uppercase text-gray-500 tracking-widest mb-1 font-display">{stat.label}</p>
              <h3 className={cn("text-3xl font-black leading-none", stat.color)}>{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Control Panel */}
      <Card className="border-primary/10 bg-black/40 overflow-hidden">
        <CardHeader className="bg-zinc-900/50 border-b border-white/5 px-6 py-4 flex flex-row items-center justify-between">
           <div className="flex items-center gap-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input 
                  placeholder="BUSCAR EMPLEADO..." 
                  className="pl-10 text-[10px] uppercase h-10 w-64 bg-black/40 border-white/10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-4">
                <button className="text-[9px] uppercase font-bold text-primary border-b border-primary">Todos</button>
                <button className="text-[9px] uppercase font-bold text-gray-500 hover:text-white transition-colors">Activos</button>
                <button className="text-[9px] uppercase font-bold text-gray-500 hover:text-white transition-colors">Licencia</button>
                <button className="text-[9px] uppercase font-bold text-gray-500 hover:text-white transition-colors">Alertas</button>
              </div>
           </div>
           <Button variant="ghost" size="icon" className="text-gray-500"><Filter size={16} /></Button>
        </CardHeader>
        
        <CardContent className="p-0">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/80 border-b border-white/10">
                <th className="p-4 text-[9px] text-gray-500 uppercase tracking-[0.2em] font-black pl-8">Legajo / Nombre</th>
                <th className="p-4 text-[9px] text-gray-500 uppercase tracking-[0.2em] font-black">Rol Operativo</th>
                <th className="p-4 text-[9px] text-gray-500 uppercase tracking-[0.2em] font-black">Control Documental</th>
                <th className="p-4 text-[9px] text-gray-500 uppercase tracking-[0.2em] font-black">Hrs (Mes)</th>
                <th className="p-4 text-[9px] text-gray-500 uppercase tracking-[0.2em] font-black">Estado</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {mockStaff.map((staff, i) => (
                <motion.tr 
                  key={staff.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-all group cursor-pointer"
                >
                  <td className="p-4 pl-8">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-bold font-mono">
                        {staff.id.split('-')[1]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white uppercase group-hover:text-primary transition-colors">{staff.name}</p>
                        <p className="text-[9px] text-gray-500 font-mono tracking-tighter">UID_{staff.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                       <Briefcase size={14} className="text-gray-600" />
                       <span className="text-xs uppercase text-gray-300 font-medium tracking-tight">{staff.role}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-4">
                      {/* Documentation Traffic Light */}
                      <DocIndicator label="PSI" status={staff.documentStatus.psych} icon={FileBadge} />
                      <DocIndicator label="LIC" status={staff.documentStatus.license} icon={IdCard} />
                      <DocIndicator label="UNIF" status={staff.documentStatus.uniform} icon={ShieldCheck} />
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-xs font-mono font-bold text-gray-300">
                      {staff.hoursMonthly} <span className="text-[9px] text-gray-600">H</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-sm border",
                      staff.status === 'Activo' ? "border-green-500/20 text-green-500 bg-green-500/5 shadow-[0_0_8px_rgba(34,197,94,0.1)]" :
                      staff.status === 'Licencia' ? "border-amber-500/20 text-amber-500 bg-amber-500/5" :
                      "border-red-500/20 text-red-500 bg-red-500/5 shadow-[0_0_8px_rgba(239,68,68,0.1)]"
                    )}>
                      {staff.status}
                    </span>
                  </td>
                  <td className="p-4 text-right pr-6">
                    <Button variant="ghost" size="icon" className="text-gray-700 hover:text-primary transition-colors">
                       <MoreVertical size={16} />
                    </Button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      
      {/* Footer / Pagination Placeholder */}
      <div className="flex justify-between items-center px-2">
        <p className="text-[10px] text-gray-600 uppercase italic font-mono tracking-tighter">SPS_CORP_HUMAN_RESOURCES_PROTOCOL_REV_1.2</p>
        <div className="flex gap-2">
           <Button variant="outline" size="sm" className="h-8 text-[9px] border-white/10" disabled>ANTERIOR</Button>
           <Button variant="outline" size="sm" className="h-8 text-[9px] border-white/10">SIGUIENTE</Button>
        </div>
      </div>

    </div>
  );
}

function DocIndicator({ label, status, icon: Icon }: { label: string, status: string, icon: any }) {
  return (
    <div className="flex flex-col items-center gap-1 group/doc">
      <div className={cn(
        "w-7 h-7 flex items-center justify-center rounded-xs border transition-all cursor-help relative",
        status === 'valid' ? "bg-green-500/5 border-green-500/20 text-green-500" :
        status === 'warning' ? "bg-amber-500/5 border-amber-500/20 text-amber-500" :
        status === 'pending' ? "bg-blue-500/5 border-blue-500/20 text-blue-500" :
        "bg-red-500/5 border-red-500/20 text-red-500"
      )}>
        <Icon size={12} />
        {/* Tooltip Simulation */}
        <div className="absolute hidden group-hover/doc:block bottom-full mb-2 bg-black border border-white/20 p-2 text-[8px] uppercase tracking-widest whitespace-nowrap z-50 text-white shadow-2xl">
           Status: {status}
        </div>
      </div>
      <span className="text-[7px] font-black text-gray-600 tracking-tighter">{label}</span>
    </div>
  );
}
