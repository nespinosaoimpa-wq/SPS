'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Clock, 
  Download, 
  Calendar, 
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

export default function PlanillasPage() {
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [shiftDetail, setShiftDetail] = useState<any[]>([]);

  // Default date range: current month
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.payroll.getSummary({ from, to });
      setSummary(result.summary || []);
      if (selectedOperator) {
        setShiftDetail(result.shifts?.filter((s: any) => s.operator_id === selectedOperator) || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [from, to, selectedOperator]);

  useEffect(() => { fetchData(); }, [from, to]);

  const handleExport = () => {
    const rows = summary.map(op => [
      op.operator_name,
      op.shifts_count,
      op.regular_hours.toFixed(2),
      op.overtime_hours.toFixed(2),
      op.total_hours.toFixed(2),
      op.objectives.join(' / '),
    ]);

    const csv = [
      ['Operador', 'Turnos', 'Horas Regulares', 'Horas Extra', 'Total Horas', 'Objetivos'].join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planilla-${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8 bg-zinc-950 min-h-screen text-zinc-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#D4AF37]/20 rounded-2xl flex items-center justify-center shadow-lg shadow-[#D4AF37]/10 border border-[#D4AF37]/30">
              <Briefcase size={24} className="text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-zinc-100 tracking-tighter uppercase">Nómina & Liquidación</h1>
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
                {from} → {to} · {summary.length} operadores
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 shadow-sm backdrop-blur-xl">
            <Calendar size={13} className="text-[#D4AF37]" />
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="text-xs font-bold text-zinc-300 border-none bg-transparent focus:outline-none [color-scheme:dark]" />
            <span className="text-zinc-500 font-bold">→</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="text-xs font-bold text-zinc-300 border-none bg-transparent focus:outline-none [color-scheme:dark]" />
          </div>
          <Button variant="outline" onClick={fetchData} className="h-10 px-3 rounded-xl border-white/10 text-zinc-300 hover:bg-white/10">
            <RefreshCw size={14} />
          </Button>
          <Button onClick={handleExport} disabled={summary.length === 0}
            className="h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 bg-[#D4AF37] text-zinc-950 hover:bg-[#b8952b]">
            <Download size={14} /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Summary totals bar */}
      {summary.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Operadores', value: summary.length, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10 border border-blue-500/20' },
            { label: 'Total Turnos', value: summary.reduce((a, o) => a + o.shifts_count, 0), icon: Clock, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/20' },
            { label: 'Horas Regulares', value: summary.reduce((a, o) => a + o.regular_hours, 0).toFixed(1) + 'h', icon: TrendingUp, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10 border border-[#D4AF37]/20' },
            { label: 'Total Pagos', value: '$' + (summary.reduce((a, o) => a + o.total_hours, 0) * 3500).toLocaleString('es-AR'), icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border border-amber-500/20' },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-5 border-white/10 shadow-lg shadow-black/50 bg-white/5 backdrop-blur-xl flex items-center gap-4 rounded-2xl">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", stat.bg)}>
                  <stat.icon size={18} className={stat.color} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-xl font-black text-zinc-100">{stat.value}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Main table */}
      <Card className="border border-white/10 shadow-2xl overflow-hidden rounded-3xl bg-zinc-900/50 backdrop-blur-xl">
        {loading ? (
          <div className="p-20 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-white/10 border-t-[#D4AF37] rounded-full animate-spin" />
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Calculando nómina...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertCircle size={40} className="text-red-500/50 mx-auto mb-4" />
            <p className="text-sm font-bold text-red-500">{error}</p>
            <p className="text-xs text-zinc-500 mt-2">Verificar conectividad.</p>
          </div>
        ) : summary.length === 0 ? (
          <div className="p-20 text-center">
            <Briefcase size={48} className="text-zinc-800 mx-auto mb-4" />
            <h3 className="text-lg font-black text-zinc-100 uppercase tracking-tighter">Sin turnos en el período</h3>
            <p className="text-zinc-500 text-sm mt-2 max-w-xs mx-auto font-bold tracking-wide">Cambiá el rango de fechas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-zinc-100">
              <thead>
                <tr className="border-b border-white/10 bg-black/40">
                  {['Operador', 'Turnos', 'Hs Regulares', 'Hs Extra', 'Total Horas', 'A Pagar', 'Objetivos', ''].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-[9px] font-black text-zinc-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {summary.map((op, i) => (
                  <motion.tr
                    key={op.operator_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                    onClick={() => {
                      setSelectedOperator(selectedOperator === op.operator_id ? null : op.operator_id);
                      setShiftDetail(op.shifts || []);
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                          <Users size={14} className="text-primary" />
                        </div>
                        <span className="text-sm font-black text-gray-900 uppercase tracking-tight truncate">{op.operator_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-gray-700 tabular-nums">{op.shifts_count}</td>
                    <td className="px-6 py-4 text-sm font-black text-gray-700 tabular-nums">{op.regular_hours.toFixed(2)}h</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-sm font-black tabular-nums",
                        op.overtime_hours > 0 ? "text-amber-600" : "text-gray-300"
                      )}>
                        {op.overtime_hours.toFixed(2)}h
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-base font-black text-zinc-100 tabular-nums">{op.total_hours.toFixed(2)}h</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-base font-black text-[#D4AF37] tabular-nums">${(op.total_hours * 3500).toLocaleString('es-AR')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {op.objectives.slice(0, 2).map((obj: string, j: number) => (
                          <span key={j} className="text-[9px] bg-white/5 text-zinc-400 border border-white/10 px-2 py-0.5 rounded font-bold uppercase">
                            {obj}
                          </span>
                        ))}
                        {op.objectives.length > 2 && (
                          <span className="text-[9px] text-gray-400 font-bold">+{op.objectives.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <ChevronRight size={16} className={cn(
                        "text-gray-200 transition-all group-hover:text-primary group-hover:translate-x-0.5",
                        selectedOperator === op.operator_id && "rotate-90 text-primary"
                      )} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            {/* Shift detail accordion */}
            {selectedOperator && shiftDetail.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="border-t-4 border-primary/20 bg-gray-50/50"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Desglose de Turnos — {summary.find(o => o.operator_id === selectedOperator)?.operator_name}
                    </p>
                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                      {shiftDetail.length} turnos registrados
                    </span>
                  </div>
                  
                  {/* Detail table header */}
                  <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-2 mb-2">
                    {[
                      { label: 'Fecha', span: 2 },
                      { label: 'Objetivo', span: 3 },
                      { label: 'Entrada', span: 2 },
                      { label: 'Salida', span: 2 },
                      { label: 'Duración', span: 2 },
                      { label: 'Extra', span: 1 },
                    ].map(col => (
                      <span key={col.label} className={`col-span-${col.span} text-[8px] font-black text-gray-300 uppercase tracking-widest`}>
                        {col.label}
                      </span>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {shiftDetail.map((s: any) => {
                      const objectiveName = (s.objectives as any)?.name || s.objective_id || 'Sin objetivo';
                      const checkinDate = s.checkin_time ? new Date(s.checkin_time) : null;
                      const checkoutDate = s.checkout_time ? new Date(s.checkout_time) : null;
                      
                      return (
                        <div key={s.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center px-5 py-3 bg-white rounded-2xl border border-gray-100 text-xs">
                          {/* Date */}
                          <div className="md:col-span-2 flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full shrink-0",
                              s.status === 'completado' ? 'bg-green-500' : 'bg-amber-500'
                            )} />
                            <span className="font-black text-gray-900 uppercase">
                              {checkinDate 
                                ? checkinDate.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit' })
                                : 'N/A'}
                            </span>
                          </div>
                          
                          {/* Objective */}
                          <div className="md:col-span-3">
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-black uppercase tracking-tight border border-blue-100">
                              {objectiveName}
                            </span>
                          </div>
                          
                          {/* Check-in time */}
                          <div className="md:col-span-2 font-mono font-bold text-gray-600">
                            <span className="text-[9px] text-gray-300 uppercase mr-1 md:hidden">Entrada:</span>
                            {checkinDate 
                              ? checkinDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                              : '--:--:--'}
                          </div>
                          
                          {/* Check-out time */}
                          <div className="md:col-span-2 font-mono font-bold text-gray-600">
                            <span className="text-[9px] text-gray-300 uppercase mr-1 md:hidden">Salida:</span>
                            {checkoutDate 
                              ? checkoutDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                              : <span className="text-amber-500 font-black uppercase text-[9px]">En curso</span>}
                          </div>
                          
                          {/* Duration */}
                          <div className="md:col-span-2">
                            <span className="font-black text-gray-900">
                              {s.duration_minutes 
                                ? `${Math.floor(s.duration_minutes/60)}h ${s.duration_minutes%60}m` 
                                : <span className="text-gray-300">---</span>}
                            </span>
                          </div>
                          
                          {/* Overtime */}
                          <div className="md:col-span-1">
                            {(s.overtime_minutes || 0) > 0 ? (
                              <span className="text-[9px] text-amber-600 font-black bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                +{Math.floor(s.overtime_minutes/60)}h{s.overtime_minutes%60 > 0 ? ` ${s.overtime_minutes%60}m` : ''}
                              </span>
                            ) : (
                              <span className="text-gray-200 text-[9px]">—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
