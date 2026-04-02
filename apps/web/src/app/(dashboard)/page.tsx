'use client'
import { useDashboard } from '@/hooks/useSales'
import { formatCurrency } from '@/lib/utils'
import {
  TrendingUp, TrendingDown, DollarSign, FileText,
  AlertTriangle, Clock, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

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
    <div className={`bg-white rounded-xl border border-gray-200 p-4 md:p-5 ${href ? 'hover:border-primary-300 transition-colors' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={18} />
        </div>
        {href && <ArrowRight size={16} className="text-gray-400 mt-1" />}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-0.5">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )

  return href ? <Link href={href}>{content}</Link> : content
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboard()

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-28 animate-pulse" />
        ))}
      </div>
    )
  }

  const d = data ?? {}

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          label="Ventas del mes"
          value={formatCurrency(d.salesThisMonth ?? 0)}
          sub={`${d.salesCount ?? 0} operaciones`}
          icon={DollarSign}
          color="bg-primary-50 text-primary-600"
          href="/sales"
        />
        <StatCard
          label="Ingresos"
          value={formatCurrency(d.totalIncome ?? 0)}
          icon={TrendingUp}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          label="Egresos"
          value={formatCurrency(d.totalExpense ?? 0)}
          icon={TrendingDown}
          color="bg-red-50 text-red-600"
        />
        <StatCard
          label="Ganancia estimada"
          value={formatCurrency(d.estimatedProfit ?? 0)}
          icon={TrendingUp}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="A cobrar"
          value={formatCurrency(d.totalReceivable ?? 0)}
          icon={FileText}
          color="bg-amber-50 text-amber-600"
          href="/finance"
        />
        <StatCard
          label="A pagar"
          value={formatCurrency(d.totalPayable ?? 0)}
          icon={Clock}
          color="bg-orange-50 text-orange-600"
          href="/finance"
        />
      </div>

      {/* Gráfico + Stock bajo */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Gráfico de ingresos vs egresos */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-4 md:p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Ingresos vs Egresos (últimos 6 meses)</h2>
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
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Area type="monotone" dataKey="income" name="Ingresos" stroke="#6366f1" fill="url(#income)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" name="Egresos" stroke="#ef4444" fill="url(#expense)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">
              Sin datos aún
            </div>
          )}
        </div>

        {/* Stock bajo */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Stock bajo</h2>
            <Link href="/products?lowStock=true" className="text-xs text-primary-600 hover:underline">
              Ver todos
            </Link>
          </div>
          {d.lowStockProducts?.length > 0 ? (
            <ul className="space-y-2">
              {d.lowStockProducts.slice(0, 6).map((p: any) => (
                <li key={p.id} className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-800 truncate">{p.name}</div>
                    <div className="text-xs text-gray-500">
                      {p.stock} / mín {p.minStock}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-400 text-center py-6">
              Sin alertas de stock
            </div>
          )}
        </div>
      </div>

      {/* Últimas ventas */}
      {d.recentSales?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Últimas ventas</h2>
            <Link href="/sales" className="text-xs text-primary-600 hover:underline">Ver todas</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {d.recentSales.map((sale: any) => (
              <div key={sale.id} className="flex items-center justify-between px-4 md:px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    #{sale.number} · {sale.clientName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(sale.date).toLocaleDateString('es-AR')}
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-900">
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
