'use client';

import React, { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Calculator, Clock, ShieldCheck, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

export default function PayrollPage() {
  const [payroll, setPayroll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/payroll')
      .then(res => res.json())
      .then(data => {
        setPayroll(data);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const exportToCSV = () => {
    const ws = XLSX.utils.json_to_sheet(payroll.map(p => ({
      Operador: p.operator_name,
      Objetivo: p.objective_name,
      'Ingreso': new Date(p.check_in).toLocaleString('es-AR'),
      'Egreso': new Date(p.check_out).toLocaleString('es-AR'),
      'Horas Totales': p.total_hours,
      'Tarifa/Hora': p.hourly_rate,
      'Monto a Liquidar': p.total_amount
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Liquidacion");
    XLSX.writeFile(wb, `Liquidacion_SPS704_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const totalAmount = payroll.reduce((acc, curr) => acc + curr.total_amount, 0);
  const totalHours = payroll.reduce((acc, curr) => acc + curr.total_hours, 0);

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto min-h-screen bg-zinc-950 pb-32">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 pb-8 border-b border-white/10">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-[#D4AF37]/5 flex items-center justify-center border border-[#D4AF37]/20 relative group">
            <div className="absolute inset-0 bg-[#D4AF37]/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all" />
            <Calculator size={36} className="text-[#D4AF37] relative z-10" />
          </div>
          <div>
            <h1 className="text-white">Planilla de Pagos</h1>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mt-3 flex items-center gap-2">
               <ShieldCheck size={14} className="text-[#D4AF37]" /> Cómputo Forense de Haberes
            </p>
          </div>
        </div>

        <button 
          onClick={exportToCSV}
          disabled={loading || payroll.length === 0}
          className="h-14 px-8 btn-premium min-w-[200px]"
        >
          <Download size={18} />
          <span>Exportar Liquidación</span>
        </button>
      </div>

      {/* SUMMARY DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="card-tactical p-8 border-none ring-1 ring-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={64} className="text-[#D4AF37]" />
          </div>
          <p className="status-label mb-4">Total Liquidación</p>
          <p className="text-5xl font-black tracking-tighter text-white data-mono">
            ${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="card-tactical p-8 border-none ring-1 ring-white/5 shadow-2xl relative overflow-hidden">
          <p className="status-label mb-4">Horas Totales</p>
          <p className="text-5xl font-black tracking-tighter text-white data-mono">
            {totalHours.toFixed(1)} <span className="text-xl text-zinc-600">HRS</span>
          </p>
        </div>

        <div className="card-tactical p-8 border-none ring-1 ring-white/5 shadow-2xl relative overflow-hidden flex flex-col justify-center">
          <p className="status-label mb-4">Tarifa Operativa</p>
          <div className="flex items-center gap-3">
             <span className="text-4xl font-black text-white data-mono">$3.500</span>
             <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">/ Hora</span>
          </div>
        </div>
      </div>

      {/* FORENSIC TABLE */}
      <div className="card-tactical overflow-hidden border-none ring-1 ring-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-black/50 border-b border-white/5 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                <th className="px-8 py-6">Personal Táctico</th>
                <th className="px-8 py-6">Nodo de Objetivo</th>
                <th className="px-8 py-6">Check-In / Out</th>
                <th className="px-8 py-6 text-right">Hrs</th>
                <th className="px-8 py-6 text-right">Tarifa</th>
                <th className="px-8 py-6 text-right text-[#D4AF37]">Total Liquidado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="w-8 h-8 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Procesando Cómputos...</p>
                  </td>
                </tr>
              ) : payroll.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest italic">No hay registros pendientes para el periodo actual</p>
                  </td>
                </tr>
              ) : (
                payroll.map((p) => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-white/5 flex items-center justify-center font-black text-[10px] text-zinc-500">
                             {p.operator_name?.substring(0,2).toUpperCase()}
                          </div>
                          <span className="font-black text-zinc-200 uppercase tracking-tight">{p.operator_name}</span>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-zinc-500 font-bold uppercase text-[10px] tracking-widest">{p.objective_name}</td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col gap-1">
                          <p className="text-[11px] font-mono font-bold text-zinc-400 tabular-nums">
                             {new Date(p.check_in).toLocaleTimeString('es-AR', {hour: '2-digit', minute: '2-digit'})} - {new Date(p.check_out).toLocaleTimeString('es-AR', {hour: '2-digit', minute: '2-digit'})}
                          </p>
                          <p className="text-[9px] font-black text-zinc-600 uppercase">{new Date(p.check_in).toLocaleDateString('es-AR')}</p>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <span className="data-mono font-black text-zinc-300 text-lg">{p.total_hours}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <span className="data-mono text-zinc-500 font-bold">$3.500</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <span className="data-mono font-black text-[#D4AF37] text-xl">
                          ${p.total_amount.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                       </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
