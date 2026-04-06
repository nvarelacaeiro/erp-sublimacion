'use client'
import { useState } from 'react'
import { useDashboard } from '@/hooks/useSales'
import { formatCurrency } from '@/lib/utils'
import {
  TrendingUp, TrendingDown, DollarSign, FileText,
  AlertTriangle, Clock, ArrowRight, ChevronLeft, ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { addDays, subDays, addMonths, subMonths, format } from 'date-fns'
import { es } from 'date-fns/locale'

const RANGES = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: '3months', label: '3 meses' },
  { value: 'year', label: 'Año' },
]

function StatCard({
  label, value, sub, icon: Icon, color, href,
}: {
  label: string
  value: string
  sub?: string
  icon: any
  color: string
  href?: string
}) {
  const content = (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 md:p-5 ${href ? 'hover:border-primary-300 dark:hover:border-primary-500 transition-colors' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={18} />
        </div>
        {href && <ArrowRight size={16} className="text-gray-400 dark:text-slate-500 mt-1" />}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-0.5">{value}</div>
      <div className="text-sm text-gray-500 dark:text-slate-400">{label}</div>
      {sub && <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">{sub}</div>}
    </div>
  )

  return href ? <Link href={href}>{content}</Link> : content
}

function periodLabel(range: string, navDate: Date): string {
  if (range === 'today') return format(navDate, "EEEE dd/MM/yyyy", { locale: es })
  if (range === 'week') {
    const from = subDays(navDate, 6)
    return `${format(from, 'dd/MM')} – ${format(navDate, 'dd/MM/yyyy')}`
  }
  if (range === 'month') return format(navDate, 'MMMM yyyy', { locale: es })
  if (range === '3months') {
    const from = subMonths(navDate, 3)
    return `${format(from, 'MM/yyyy')} – ${format(navDate, 'MM/yyyy')}`
  }
  if (range === 'year') return format(navDate, 'yyyy')
  return ''
}

export default function DashboardPage() {
  const [range, setRange] = useState('month')
  const [navDate, setNavDate] = useState(new Date())

  function getParams() {
    if (range === 'today') {
      const d = format(navDate, 'yyyy-MM-dd')
      return { range: 'custom', from: d, to: d }
    }
    if (range === 'week') {
      const to = format(navDate, 'yyyy-MM-dd')
      const from = format(subDays(navDate, 6), 'yyyy-MM-dd')
      return { range: 'custom', from, to }
    }
    if (range === 'month') {
      const d = format(navDate, 'yyyy-MM-dd')
      return { range: 'month', from: d, to: d }
    }
    if (range === '3months') {
      const to = format(navDate, 'yyyy-MM-dd')
      const from = format(subMonths(navDate, 3), 'yyyy-MM-dd')
      return { range: 'custom', from, to }
    }
    if (range === 'year') {
      const to = format(navDate, 'yyyy-MM-dd')
      const from = format(new Date(navDate.getFullYear(), 0, 1), 'yyyy-MM-dd')
      return { range: 'custom', from, to }
    }
    return { range }
  }

  function navigate(dir: 'prev' | 'next') {
    setNavDate(prev => {
      if (range === 'today') return dir === 'prev' ? subDays(prev, 1) : addDays(prev, 1)
      if (range === 'week') return dir === 'prev' ? subDays(prev, 7) : addDays(prev, 7)
      if (range === 'month') return dir === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
      if (range === '3months') return dir === 'prev' ? subMonths(prev, 3) : addMonths(prev, 3)
      if (range === 'year') {
        const y = prev.getFullYear() + (dir === 'prev' ? -1 : 1)
        return new Date(y, 11, 31)
      }
      return prev
    })
  }

  const isFuture = navDate > new Date()
  const { data, isLoading } = useDashboard(getParams())

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 h-28 animate-pulse" />
        ))}
      </div>
    )
  }

  const d = data ?? {}

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Selector de rango */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1 gap-0.5">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => { setRange(r.value); setNavDate(new Date()) }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                range === r.value
                  ? 'bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-400 shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => navigate('prev')}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300 min-w-[120px] text-center capitalize">
            {periodLabel(range, navDate)}
          </span>
          <button
            onClick={() => navigate('next')}
            disabled={isFuture}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Ventas" value={formatCurrency(d.salesThisMonth ?? 0)} sub={`${d.salesCount ?? 0} operaciones`} icon={DollarSign} color="bg-primary-50 dark:bg-primary-600/20 text-primary-600 dark:text-primary-400" href="/sales" />
        <StatCard label="Ingresos" value={formatCurrency(d.totalIncome ?? 0)} icon={TrendingUp} color="bg-green-50 dark:bg-green-600/20 text-green-600 dark:text-green-400" />
        <StatCard label="Egresos" value={formatCurrency(d.totalExpense ?? 0)} icon={TrendingDown} color="bg-red-50 dark:bg-red-600/20 text-red-600 dark:text-red-400" />
        <StatCard label="Ganancia" value={formatCurrency(d.estimatedProfit ?? 0)} icon={TrendingUp} color={(d.estimatedProfit ?? 0) >= 0 ? 'bg-emerald-50 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-600/20 text-red-600 dark:text-red-400'} />
        <StatCard label="A cobrar" value={formatCurrency(d.totalReceivable ?? 0)} icon={FileText} color="bg-amber-50 dark:bg-amber-600/20 text-amber-600 dark:text-amber-400" href="/finance" />
        <StatCard label="A pagar" value={formatCurrency(d.totalPayable ?? 0)} icon={Clock} color="bg-orange-50 dark:bg-orange-600/20 text-orange-600 dark:text-orange-400" href="/finance" />
      </div>

      {/* Gráfico + Stock bajo */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 md:p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-4">Ingresos vs Egresos</h2>
          {d.chart?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={d.chart}>
                <defs>
                  <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', border: '1px solid #e2e8f0', borderRadius: 8 }}
                />
                <Legend />
                <Area type="monotone" dataKey="income" name="Ingresos" stroke="#6366f1" fill="url(#income)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" name="Egresos" stroke="#ef4444" fill="url(#expense)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400 dark:text-slate-500">
              Sin movimientos en este período
            </div>
          )}
        </div>

        {/* Stock bajo */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Stock bajo</h2>
            <Link href="/products" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">Ver todos</Link>
          </div>
          {d.lowStockProducts?.length > 0 ? (
            <ul className="space-y-2">
              {d.lowStockProducts.slice(0, 6).map((p: any) => (
                <li key={p.id} className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-800 dark:text-slate-200 truncate">{p.name}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">{p.stock} / mín {p.minStock}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-400 dark:text-slate-500 text-center py-6">Sin alertas de stock</div>
          )}
        </div>
      </div>

      {/* Últimas ventas */}
      {d.recentSales?.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-gray-100 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Ventas del período</h2>
            <Link href="/sales" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">Ver todas</Link>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-slate-700">
            {d.recentSales.map((sale: any) => (
              <div key={sale.id} className="flex items-center justify-between px-4 md:px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                    #{sale.number} · {sale.clientName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    {new Date(sale.date).toLocaleDateString('es-AR')}
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {formatCurrency(sale.total)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
