'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Loader2, DollarSign, Calculator, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PayrollPanelProps {
  operatorId: string;
  initialRate: number;
  shifts: any[];
}

export function PayrollPanel({ operatorId, initialRate, shifts }: PayrollPanelProps) {
  const [payRate, setPayRate] = useState<string>(initialRate.toString());
  const [isUpdating, setIsUpdating] = useState(false);

  // Filter shifts for the current month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthShifts = shifts.filter(s => {
    const d = new Date(s.checkin_time);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // Calculate totals
  let totalMs = 0;
  monthShifts.forEach(s => {
    const start = new Date(s.checkin_time).getTime();
    const end = s.checkout_time ? new Date(s.checkout_time).getTime() : new Date().getTime();
    totalMs += Math.max(0, end - start);
  });
  
  const totalHours = totalMs / 3600000;
  const rate = parseFloat(payRate) || 0;
  const totalPay = totalHours * rate;

  const handleUpdateRate = async () => {
    if (!operatorId || !payRate) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('resources')
        .update({ salary: parseFloat(payRate) })
        .eq('id', operatorId);
      
      if (error) throw error;
      alert("¡Valor Hora actualizado con éxito!");
    } catch (err: any) {
      alert("Error al actualizar tarifa: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="card-tactical p-10 print:p-0 print:border-none print:shadow-none print:bg-white">
      {/* Print Header */}
      <div className="hidden print:block text-center mb-8 border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-black uppercase text-gray-900 tracking-widest">SPS CORPORATE SECURITY</h1>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Cómputo de Haberes Mensuales</p>
        <p className="text-[10px] text-gray-400 font-mono mt-2">ID Prestador: {operatorId} | Emisión: {new Date().toLocaleDateString('es-AR')}</p>
      </div>

      <div className="flex justify-between items-center mb-10 print:hidden">
        <h2 className="text-2xl font-black uppercase tracking-tighter text-primary flex items-center gap-4">
          <Calculator size={24} /> Cómputo de Haberes
        </h2>
        <Button 
          variant="primary" 
          size="sm" 
          className="rounded-xl h-10 px-6 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
          onClick={() => window.print()}
        >
          <FileText size={14} className="mr-2" /> Exportar a PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print:hidden">
        <div className="space-y-4">
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Valor Hora de Pago</p>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-[200px]">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-black"><DollarSign size={16}/></span>
              <Input 
                type="number"
                value={payRate}
                onChange={(e) => setPayRate(e.target.value)}
                className="pl-10 h-12 bg-black/40 border-white/10 text-white font-mono text-lg rounded-2xl focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <Button 
              onClick={handleUpdateRate}
              disabled={isUpdating || parseFloat(payRate) === initialRate}
              variant="outline" 
              className="h-12 border-primary/20 text-primary hover:bg-primary/10 uppercase tracking-widest text-[10px] font-black px-6 rounded-2xl"
            >
              {isUpdating ? <Loader2 size={16} className="animate-spin" /> : 'Actualizar Tarifa'}
            </Button>
          </div>
        </div>
      </div>

      {/* Resumen Mensual */}
      <div className="bg-black/40 border border-white/5 rounded-3xl p-8 mb-8 print:border-none print:p-0 print:bg-transparent">
        <h3 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-6 print:text-gray-500">Resumen Operativo (Mes Actual)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-6 bg-zinc-900 rounded-2xl border-l-4 border-zinc-700 print:border-gray-200 print:bg-gray-50">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest print:text-gray-500 mb-1">Horas Trabajadas (Mes)</p>
            <p className="text-3xl font-mono font-black text-white print:text-gray-900">
              {totalHours.toFixed(2)} <span className="text-lg text-zinc-600 print:text-gray-400">HRS</span>
            </p>
          </div>
          
          <div className="p-6 bg-zinc-900 rounded-2xl border-l-4 border-[#D4AF37] print:border-gray-200 print:bg-gray-50">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest print:text-gray-500 mb-1">Sueldo a Liquidar</p>
            <p className="text-4xl font-mono font-black text-[#D4AF37] print:text-gray-900">
              $ {totalPay.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Desglose de Objetivos */}
      <div className="print:text-gray-900">
        <h3 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 print:text-gray-500">Objetivos Visitados</h3>
        <div className="space-y-3">
          {monthShifts.length > 0 ? Array.from(new Set(monthShifts.map(s => s.objectives?.name))).map(objName => {
            const shiftsInObj = monthShifts.filter(s => s.objectives?.name === objName);
            const msInObj = shiftsInObj.reduce((acc, s) => {
              const start = new Date(s.checkin_time).getTime();
              const end = s.checkout_time ? new Date(s.checkout_time).getTime() : new Date().getTime();
              return acc + Math.max(0, end - start);
            }, 0);
            return (
              <div key={objName as string} className="flex justify-between items-center p-4 bg-zinc-900/50 rounded-xl border border-white/5 print:bg-gray-50 print:border-gray-100">
                <p className="text-sm font-black text-white uppercase print:text-gray-900">{objName as string || 'Unidad Móvil'}</p>
                <p className="text-xs font-mono font-bold text-zinc-400 print:text-gray-600">{(msInObj / 3600000).toFixed(2)} hrs</p>
              </div>
            );
          }) : (
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest italic py-4">No hay turnos registrados en este mes</p>
          )}
        </div>
      </div>
    </div>
  );
}
