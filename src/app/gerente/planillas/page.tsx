'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calculator,
  Download,
  TrendingUp,
  Users,
  Clock,
  DollarSign,
  Building2,
  ChevronDown,
  FileSpreadsheet,
  Calendar,
  Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'

type PayrollData = {
  shifts: any[]
  nomina: any[]
  facturacion: any[]
  totals: {
    total_hours: number
    total_pay: number
    total_billing: number
    shifts_count: number
  }
}

export default function PayrollPage() {
  const [data, setData] = useState<PayrollData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'nomina' | 'facturacion'>('nomina')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  const fetchPayroll = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate })
      const res = await fetch(`/api/payroll?${params}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayroll()
  }, [startDate, endDate])

  const exportNomina = () => {
    if (!data) return
    const ws = XLSX.utils.json_to_sheet(
      data.nomina.map((r) => ({
        'Apellido y Nombre': r.operator_name,
        Función: r.operator_role,
        'Turnos Realizados': r.shifts_count,
        'Horas Totales': r.total_hours.toFixed(2),
        'Tarifa/Hora': `$${r.hourly_pay_rate.toLocaleString('es-AR')}`,
        'Total Haberes': `$${r.total_pay.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
      }))
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Nómina')
    XLSX.writeFile(wb, `Nomina_SPS704_${startDate}_${endDate}.xlsx`)
  }

  const exportFacturacion = () => {
    if (!data) return
    const ws = XLSX.utils.json_to_sheet(
      data.facturacion.map((r) => ({
        'Puesto de Servicio': r.objective_name,
        'Personal Asignado': r.operators.join(', '),
        'Turnos Cubiertos': r.shifts_count,
        'Horas Facturables': r.total_hours.toFixed(2),
        'Tarifa/Hora': `$${r.hourly_billing_rate.toLocaleString('es-AR')}`,
        'Total a Facturar': `$${r.total_billing.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
      }))
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Facturación')
    XLSX.writeFile(wb, `Facturacion_SPS704_${startDate}_${endDate}.xlsx`)
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 lg:p-10 pb-32">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#D4AF37] rounded-2xl flex items-center justify-center shadow-lg shadow-[#D4AF37]/30">
            <Calculator size={28} className="text-black" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Cómputo de Haberes</h1>
            <p className="text-sm font-semibold text-zinc-400 mt-0.5 uppercase tracking-widest">
              Nómina · Facturación · Liquidación
            </p>
          </div>
        </div>

        <button
          onClick={activeTab === 'nomina' ? exportNomina : exportFacturacion}
          disabled={loading || !data}
          className="flex items-center gap-2 h-12 px-7 bg-zinc-900 text-white rounded-2xl font-bold text-sm shadow-lg hover:bg-zinc-800 transition-colors disabled:opacity-40"
        >
          <Download size={18} />
          Exportar {activeTab === 'nomina' ? 'Nómina' : 'Facturación'}
        </button>
      </div>

      {/* DATE FILTER BAR */}
      <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-4 flex flex-wrap gap-4 items-center mb-8">
        <div className="flex items-center gap-2 text-zinc-400">
          <Filter size={16} />
          <span className="text-xs font-bold uppercase tracking-widest">Período</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-zinc-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
            />
          </div>
          <span className="text-zinc-400 font-bold">→</span>
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-zinc-400" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
            />
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          {
            label: 'Horas Totales',
            value: `${data?.totals.total_hours.toFixed(1) ?? '0'} hs`,
            icon: Clock,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            label: 'Total Turnos',
            value: data?.totals.shifts_count ?? 0,
            icon: Users,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
          },
          {
            label: 'Nómina a Pagar',
            value: `$${(data?.totals.total_pay ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`,
            icon: DollarSign,
            color: 'text-[#D4AF37]',
            bg: 'bg-amber-50',
          },
          {
            label: 'Total a Facturar',
            value: `$${(data?.totals.total_billing ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`,
            icon: TrendingUp,
            color: 'text-[#D4AF37]',
            bg: 'bg-amber-50',
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-5 flex items-center gap-4"
          >
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', stat.bg)}>
              <stat.icon size={22} className={stat.color} />
            </div>
            <div>
              <p className="text-xl font-black text-zinc-900 leading-none">{loading ? '—' : stat.value}</p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-6">
        {(['nomina', 'facturacion'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
              activeTab === tab
                ? 'bg-zinc-900 text-white shadow-lg'
                : 'bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-800'
            )}
          >
            {tab === 'nomina' ? <Users size={14} /> : <Building2 size={14} />}
            {tab === 'nomina' ? 'Liquidación de Operadores' : 'Facturación por Objetivo'}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em]">
                {activeTab === 'nomina' ? (
                  <>
                    <th className="px-6 py-4">Apellido y Nombre</th>
                    <th className="px-6 py-4">Función</th>
                    <th className="px-6 py-4 text-center">Turnos</th>
                    <th className="px-6 py-4 text-right">Horas</th>
                    <th className="px-6 py-4 text-right">Tarifa/Hora</th>
                    <th className="px-6 py-4 text-right text-[#D4AF37]">Total Haberes</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4">Puesto de Servicio</th>
                    <th className="px-6 py-4">Personal Asignado</th>
                    <th className="px-6 py-4 text-center">Turnos</th>
                    <th className="px-6 py-4 text-right">Horas</th>
                    <th className="px-6 py-4 text-right">Tarifa/Hora</th>
                    <th className="px-6 py-4 text-right text-[#D4AF37]">Total Facturación</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-6 py-4">
                      <div className="h-4 bg-zinc-100 rounded-full animate-pulse w-full" />
                    </td>
                  </tr>
                ))
              ) : activeTab === 'nomina' ? (
                (data?.nomina ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest">
                      No hay registros en el período seleccionado
                    </td>
                  </tr>
                ) : (
                  (data?.nomina ?? []).map((r) => (
                    <tr key={r.operator_id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-xs font-black text-zinc-600">
                            {r.operator_name?.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-zinc-900">{r.operator_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 text-xs font-semibold uppercase tracking-wide">
                        {r.operator_role}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-100 text-xs font-black text-zinc-700">
                          {r.shifts_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-black text-zinc-800">
                        {r.total_hours.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-zinc-500 text-sm">
                        ${r.hourly_pay_rate.toLocaleString('es-AR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-black text-[#D4AF37] text-base font-mono">
                          ${r.total_pay.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  ))
                )
              ) : (data?.facturacion ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest">
                    No hay registros en el período seleccionado
                  </td>
                </tr>
              ) : (
                (data?.facturacion ?? []).map((r) => (
                  <tr key={r.objective_id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                          <Building2 size={16} className="text-amber-600" />
                        </div>
                        <span className="font-bold text-zinc-900">{r.objective_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 text-xs font-semibold max-w-[200px] truncate">
                      {r.operators.join(', ')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-100 text-xs font-black text-zinc-700">
                        {r.shifts_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-black text-zinc-800">
                      {r.total_hours.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-zinc-500 text-sm">
                      ${r.hourly_billing_rate.toLocaleString('es-AR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-[#D4AF37] text-base font-mono">
                        ${r.total_billing.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* TOTALS FOOTER */}
            {!loading && data && (data.nomina.length > 0 || data.facturacion.length > 0) && (
              <tfoot>
                <tr className="bg-zinc-900 text-white">
                  <td colSpan={3} className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-400">
                    TOTAL DEL PERÍODO
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-black">
                    {data.totals.total_hours.toFixed(2)} hs
                  </td>
                  <td className="px-6 py-4" />
                  <td className="px-6 py-4 text-right font-mono font-black text-[#D4AF37] text-lg">
                    ${(activeTab === 'nomina' ? data.totals.total_pay : data.totals.total_billing).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
