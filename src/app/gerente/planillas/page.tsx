'use client';

import React, { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Calculator } from 'lucide-react';
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
    <div className="p-6 lg:p-10 max-w-7xl mx-auto min-h-screen text-zinc-100 bg-black">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/30">
            <Calculator size={32} className="text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Planilla de Pagos</h1>
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest mt-1">Cómputo de Horas y Liquidación</p>
          </div>
        </div>
        <button 
          onClick={exportToCSV}
          disabled={loading || payroll.length === 0}
          className="h-12 px-6 bg-white text-black hover:bg-gray-200 disabled:opacity-50 font-black uppercase tracking-widest text-[11px] rounded-xl flex items-center gap-3 transition-colors shadow-xl"
        >
          <Download size={16} />
          Exportar CSV
        </button>
      </div>

      {/* Summary Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 rounded-[24px] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col justify-center">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <FileSpreadsheet size={14} className="text-[#D4AF37]" /> Total a Liquidar
          </p>
          <p className="text-4xl font-black tracking-tighter text-white">
            ${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-6 rounded-[24px] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col justify-center">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Clock size={14} className="text-blue-400" /> Horas Operativas Totales
          </p>
          <p className="text-4xl font-black tracking-tighter text-white">
            {totalHours.toFixed(2)} <span className="text-xl text-zinc-500 font-bold">hrs</span>
          </p>
        </div>
      </div>

      {/* High Density Table */}
      <div className="rounded-[24px] bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-black/40 border-b border-white/10 uppercase tracking-widest text-[10px] font-black text-zinc-400">
              <tr>
                <th className="px-6 py-4">Operador</th>
                <th className="px-6 py-4">Objetivo</th>
                <th className="px-6 py-4">Ingreso</th>
                <th className="px-6 py-4">Egreso</th>
                <th className="px-6 py-4 text-right">Horas</th>
                <th className="px-6 py-4 text-right">Tarifa</th>
                <th className="px-6 py-4 text-right text-[#D4AF37]">A Liquidar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 font-bold uppercase tracking-widest text-xs">
                    <div className="w-6 h-6 border-2 border-zinc-600 border-t-white rounded-full animate-spin mx-auto mb-3" />
                    Calculando Cómputos...
                  </td>
                </tr>
              ) : payroll.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 font-bold uppercase tracking-widest text-xs">
                    No hay turnos finalizados para liquidar
                  </td>
                </tr>
              ) : (
                payroll.map((p) => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">{p.operator_name}</td>
                    <td className="px-6 py-4 text-zinc-300 font-medium">{p.objective_name}</td>
                    <td className="px-6 py-4 text-zinc-400 text-xs">{new Date(p.check_in).toLocaleString('es-AR')}</td>
                    <td className="px-6 py-4 text-zinc-400 text-xs">{new Date(p.check_out).toLocaleString('es-AR')}</td>
                    <td className="px-6 py-4 text-right font-black text-blue-400">{p.total_hours}</td>
                    <td className="px-6 py-4 text-right text-zinc-400">${p.hourly_rate}</td>
                    <td className="px-6 py-4 text-right font-black text-[#D4AF37]">${p.total_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
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

function Clock(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
