'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  FileText, 
  TrendingUp, 
  Users, 
  Download, 
  Upload, 
  Plus, 
  ChevronRight,
  PieChart,
  Briefcase,
  Calendar,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

export default function AdminFinanzas() {
  const [activeTab, setActiveTab] = useState<'financial' | 'contracts' | 'documents'>('financial');

  return (
    <div className="min-h-screen bg-zinc-50 pl-32 pr-12 py-12 space-y-12">
      
      {/* 1. CLEAN BUSINESS HEADER */}
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Administración Central</p>
          <h1 className="text-5xl font-black text-zinc-900 tracking-tighter">SPS <span className="text-primary">Business Hub</span></h1>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100 flex gap-2">
            <Download size={14} /> Reporte Mensual
          </Button>
          <Button variant="vanguard" size="sm" className="flex gap-2">
            <Plus size={14} /> Nueva Entrada
          </Button>
        </div>
      </div>

      {/* 2. TOP PERFORMANCE LINE (Clean Cards) */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: 'Facturación Mensual', value: '$14.2M ARS', trend: '+12%', icon: DollarSign, color: 'text-zinc-900' },
          { label: 'Costo de Legajos (Payroll)', value: '$8.4M ARS', trend: '-2.1%', icon: Users, color: 'text-zinc-900' },
          { label: 'Crecimiento Trimestral', value: '24.5%', trend: '+4%', icon: TrendingUp, color: 'text-primary' },
          { label: 'Margen de Utilidad', value: '31.2%', trend: '+0.5%', icon: PieChart, color: 'text-blue-600' },
        ].map((kpi, i) => (
          <Card key={i} className="bg-white border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-zinc-50 rounded-lg text-zinc-400">
                  <kpi.icon size={20} />
                </div>
                <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full", kpi.trend.startsWith('+') ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                  {kpi.trend}
                </span>
              </div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{kpi.label}</p>
              <h3 className={cn("text-2xl font-black mt-1", kpi.color)}>{kpi.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. MAIN ADMINISTRATIVE CONTENT */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* LEFT: MANAGEMENT LIST */}
        <div className="col-span-8 space-y-6">
           <div className="flex gap-6 border-b border-zinc-200">
              {['Gestión Financiera', 'Contratos Activos', 'Documentación Legal'].map((tab, i) => {
                const id = ['financial', 'contracts', 'documents'][i] as any;
                const active = activeTab === id;
                return (
                  <button 
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={cn(
                      "pb-4 text-xs font-black uppercase tracking-widest transition-all relative px-2",
                      active ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
                    )}
                  >
                    {tab}
                    {active && <motion.div layoutId="tab-line" className="absolute bottom-0 inset-x-0 h-0.5 bg-zinc-900" />}
                  </button>
                )
              })}
           </div>

           <Card className="bg-white border-zinc-200 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="p-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-8">Descripción / Entidad</th>
                    <th className="p-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Monto / Valor</th>
                    <th className="p-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Vencimiento</th>
                    <th className="p-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Estado</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {[
                    { id: 1, title: 'Consorcio Portofino', amount: '$1.250.000', expiry: '15/05/2026', status: 'Facturado' },
                    { id: 2, title: 'Edificio Torremolinos', amount: '$980.000', expiry: '10/05/2026', status: 'Pendiente' },
                    { id: 3, title: 'Seguro Responsabilidad Civil', amount: '$120.000', expiry: '01/06/2026', status: 'Pagado' },
                    { id: 4, title: 'Distribuidora Santa Fe', amount: '$1.850.000', expiry: '18/05/2026', status: 'Facturado' },
                  ].map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="p-4 pl-8">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center text-zinc-400">
                              <Building2 size={16} />
                           </div>
                           <span className="text-sm font-bold text-zinc-900 uppercase">{row.title}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-mono font-bold text-zinc-900">{row.amount}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-zinc-500">
                           <Calendar size={14} />
                           <span className="text-xs font-medium">{row.expiry}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "text-[9px] font-black uppercase px-2 py-1 rounded",
                          row.status === 'Facturado' ? "bg-blue-50 text-blue-600" :
                          row.status === 'Pagado' ? "bg-green-50 text-green-600" :
                          "bg-amber-50 text-amber-600"
                        )}>
                          {row.status}
                        </span>
                      </td>
                      <td className="p-4 text-right pr-8">
                        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-900">
                           Detalles <ChevronRight size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </Card>
        </div>

        {/* RIGHT: DOCUMENT HUB (PDF Uploads) */}
        <div className="col-span-4 space-y-6">
           <Card className="bg-zinc-900 text-white border-none shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                 <Upload size={80} />
              </div>
              <CardHeader className="p-8 pb-0">
                 <CardTitle className="text-lg text-white tracking-widest leading-none mb-1">CENTRO DE ARCHIVOS</CardTitle>
                 <CardDescription className="text-zinc-500 text-[10px] font-black uppercase italic">Protocolos y Planes de Emergencia</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-6 space-y-6">
                 <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-zinc-700 transition-colors cursor-pointer group">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:scale-110 group-hover:bg-zinc-700 transition-all">
                       <Upload size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-white">Subir Nuevo PDF</p>
                      <p className="text-[10px] text-zinc-500 font-medium">Contratos . PDF . JPG</p>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Documentos Recientes</p>
                    {[
                      { name: 'Plan_Santa_Fe_V2.pdf', size: '2.4 MB', date: 'Hace 2h' },
                      { name: 'Contrato_Portofino_signed.pdf', size: '1.2 MB', date: 'Ayer' },
                      { name: 'Normativa_Legal_SPS.pdf', size: '4.8 MB', date: '01 Abr' },
                    ].map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group hover:bg-white/10 cursor-pointer transition-all">
                        <div className="flex items-center gap-3">
                           <FileText size={16} className="text-zinc-500" />
                           <div>
                              <p className="text-[11px] font-bold text-white group-hover:text-primary transition-colors">{doc.name}</p>
                              <p className="text-[9px] text-zinc-600 font-medium">{doc.size} • {doc.date}</p>
                           </div>
                        </div>
                        <CheckCircle2 size={14} className="text-green-500" />
                      </div>
                    ))}
                 </div>

                 <Button variant="vanguard" className="w-full h-12 bg-white text-zinc-900 group-hover:bg-primary transition-colors">
                    Sincronizar Cloud Hub
                 </Button>
              </CardContent>
           </Card>

           {/* Quick Summary Section */}
           <div className="p-8 bg-white border border-zinc-200 rounded-3xl space-y-6">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Briefcase size={20} />
                 </div>
                 <div>
                    <h4 className="text-xs font-black uppercase text-zinc-900 leading-none">Carga Impositiva</h4>
                    <p className="text-[9px] text-zinc-500 mt-1 uppercase font-bold tracking-tighter">Próximo Vencimiento: AFIP 20/05</p>
                 </div>
              </div>
              <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                 <div className="h-full w-[65%] bg-primary rounded-full" />
              </div>
           </div>
        </div>

      </div>

    </div>
  );
}
