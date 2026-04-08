'use client'
import { useState } from 'react'
import {
  useAccountsReceivable, useAccountsPayable,
  usePayReceivable, usePayPayable, useCreateTransaction, useTransactions,
  useFinanceAnalytics,
} from '@/hooks/useFinance'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CreditCard, TrendingUp, TrendingDown, CheckCircle, Plus, BarChart2, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts'

type Tab = 'analytics' | 'receivable' | 'payable' | 'transactions'
type Granularity = 'day' | 'week' | 'month' | 'year'

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'day', label: 'Diario' },
  { value: 'week', label: 'Semanal' },
  { value: 'month', label: 'Mensual' },
  { value: 'year', label: 'Anual' },
]

const PIE_COLORS = ['#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#f97316']

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`
  return formatCurrency(n)
}

function SummaryCard({
  label, value, sub, color = 'default',
}: {
  label: string
  value: string
  sub?: string
  color?: 'green' | 'red' | 'default' | 'purple'
}) {
  const colors = {
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-500 dark:text-red-400',
    purple: 'text-purple-600 dark:text-purple-400',
    default: 'text-gray-900 dark:text-slate-100',
  }
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
      <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">{label}</div>
      <div className={`text-xl font-bold ${colors[color]}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function AnalyticsTab() {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const [from, setFrom] = useState(firstDay.toISOString().slice(0, 10))
  const [to, setTo] = useState(today.toISOString().slice(0, 10))
  const [granularity, setGranularity] = useState<Granularity>('month')

  const { data, isLoading } = useFinanceAnalytics({ from, to, granularity })

  const summary = data?.summary
  const timeSeries = data?.timeSeries ?? []
  const topProducts = data?.topProducts ?? []
  const topClients = data?.topClients ?? []
  const expenseBreakdown = data?.expenseBreakdown ?? []

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 dark:text-slate-400">Desde</label>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 dark:text-slate-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 dark:text-slate-400">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 dark:text-slate-100"
          />
        </div>
        <select
          value={granularity}
          onChange={e => setGranularity(e.target.value as Granularity)}
          className="text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 dark:text-slate-100"
        >
          {GRANULARITY_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="flex gap-2 ml-auto flex-wrap">
          {[
            { label: 'Hoy', days: 0 },
            { label: '7d', days: 7 },
            { label: '30d', days: 30 },
            { label: '90d', days: 90 },
            { label: 'Este año', days: -1 },
          ].map(({ label, days }) => (
            <button
              key={label}
              onClick={() => {
                const t = new Date()
                const f = new Date()
                if (days === -1) {
                  f.setMonth(0); f.setDate(1)
                  setGranularity('month')
                } else if (days === 0) {
                  setGranularity('day')
                } else {
                  f.setDate(f.getDate() - days)
                  setGranularity(days <= 7 ? 'day' : days <= 30 ? 'day' : 'month')
                }
                setFrom(f.toISOString().slice(0, 10))
                setTo(t.toISOString().slice(0, 10))
              }}
              className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard
              label="Ingresos"
              value={fmt(summary?.totalIncome ?? 0)}
              sub={`${summary?.salesCount ?? 0} ventas`}
              color="green"
            />
            <SummaryCard
              label="Egresos"
              value={fmt(summary?.totalExpenses ?? 0)}
              color="red"
            />
            <SummaryCard
              label="Ganancia neta"
              value={fmt(summary?.netProfit ?? 0)}
              sub={`Margen ${(summary?.netMargin ?? 0).toFixed(1)}%`}
              color={(summary?.netProfit ?? 0) >= 0 ? 'green' : 'red'}
            />
            <SummaryCard
              label="Ticket promedio"
              value={fmt(summary?.avgTicket ?? 0)}
              color="purple"
            />
          </div>

          {/* Time-series chart */}
          {timeSeries.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-4">Evolución temporal</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={timeSeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-slate-700" />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => fmt(v)}
                    width={60}
                  />
                  <Tooltip
                    formatter={(v: number, name: string) => [
                      formatCurrency(v),
                      name === 'income' ? 'Ingresos' : name === 'expense' ? 'Egresos' : 'Ganancia',
                    ]}
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    formatter={v => v === 'income' ? 'Ingresos' : v === 'expense' ? 'Egresos' : 'Ganancia'}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="income" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expense" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top products + Top clients */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Top products */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-3">Top productos</h3>
              {topProducts.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-6">Sin datos</p>
              ) : (
                <div className="space-y-2.5">
                  {topProducts.slice(0, 5).map((p: any, i: number) => {
                    const maxRev = topProducts[0]?.revenue ?? 1
                    const pct = Math.round((p.revenue / maxRev) * 100)
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-gray-700 dark:text-slate-300 truncate flex-1 mr-2">{p.name}</span>
                          <span className="text-xs font-semibold text-gray-900 dark:text-slate-100 shrink-0">{fmt(p.revenue)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0 w-12 text-right">×{Number(p.qty).toFixed(0)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Top clients */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-3">Top clientes</h3>
              {topClients.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-6">Sin datos</p>
              ) : (
                <div className="space-y-2.5">
                  {topClients.slice(0, 5).map((c: any, i: number) => {
                    const maxTotal = topClients[0]?.total ?? 1
                    const pct = Math.round((c.total / maxTotal) * 100)
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-gray-700 dark:text-slate-300 truncate flex-1 mr-2">{c.name}</span>
                          <span className="text-xs font-semibold text-gray-900 dark:text-slate-100 shrink-0">{fmt(c.total)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0 w-12 text-right">{c.count} vtas</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Expense breakdown + Product profitability */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Expense pie */}
            {expenseBreakdown.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-3">Composición de egresos</h3>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={120} height={120}>
                    <PieChart>
                      <Pie
                        data={expenseBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={55}
                        strokeWidth={2}
                      >
                        {expenseBreakdown.map((_: any, idx: number) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => [formatCurrency(v)]}
                        contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5">
                    {expenseBreakdown.map((e: any, idx: number) => {
                      const total = expenseBreakdown.reduce((s: number, x: any) => s + x.value, 0)
                      const pct = total > 0 ? ((e.value / total) * 100).toFixed(0) : '0'
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                          <span className="text-xs text-gray-600 dark:text-slate-400 truncate flex-1">{e.name}</span>
                          <span className="text-xs font-medium text-gray-900 dark:text-slate-200 shrink-0">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Product profitability */}
            {topProducts.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-3">Rentabilidad por producto</h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-3 text-xs text-gray-400 dark:text-slate-500 px-1 mb-1">
                    <span>Producto</span>
                    <span className="text-right">Ingresos</span>
                    <span className="text-right">Ganancia est.</span>
                  </div>
                  {topProducts.slice(0, 5).map((p: any, i: number) => (
                    <div key={i} className="grid grid-cols-3 text-xs items-center px-1 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <span className="text-gray-700 dark:text-slate-300 truncate pr-2">{p.name}</span>
                      <span className="text-right text-gray-900 dark:text-slate-100">{fmt(p.revenue)}</span>
                      <span className={`text-right font-semibold ${p.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                        {p.profit >= 0 ? '+' : ''}{fmt(p.profit)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── PayModal ──────────────────────────────────────────────────────────────────

function PayModal({
  open, onClose, account, type, onPay,
}: {
  open: boolean
  onClose: () => void
  account: any
  type: 'receivable' | 'payable'
  onPay: (amount: number, notes: string) => Promise<void>
}) {
  const [amount, setAmount] = useState(account?.pending ?? 0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await onPay(amount, notes)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  if (!account) return null

  return (
    <Modal open={open} onClose={onClose} title={type === 'receivable' ? 'Registrar cobro' : 'Registrar pago'} size="sm">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-sm">
          <div className="font-medium text-gray-900 dark:text-slate-100">
            {type === 'receivable' ? account.clientName : account.supplierName}
          </div>
          <div className="text-gray-500 dark:text-slate-400 mt-0.5">
            Pendiente: <strong>{formatCurrency(account.pending)}</strong>
          </div>
        </div>
        <Input
          label="Monto a cobrar/pagar ($)"
          type="number"
          min="0.01"
          step="0.01"
          max={account.pending}
          value={amount}
          onChange={e => setAmount(Number(e.target.value))}
        />
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-1">Notas</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none bg-white dark:bg-slate-800 dark:text-slate-100"
            placeholder="Método de pago, referencia..."
          />
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" loading={loading} className="flex-1">Confirmar</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── TransactionModal ───────────────────────────────────────────────────────────

function TransactionModal({
  open, onClose, onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
}) {
  const [type, setType] = useState('INCOME')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave({ type, category, amount, description })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva transacción manual" size="sm">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <Select
          label="Tipo"
          options={[
            { value: 'INCOME', label: 'Ingreso' },
            { value: 'EXPENSE', label: 'Egreso' },
          ]}
          value={type}
          onChange={e => setType(e.target.value)}
        />
        <Input
          label="Categoría"
          placeholder="Ej: Alquiler, Servicio, Otros..."
          value={category}
          onChange={e => setCategory(e.target.value)}
          required
        />
        <Input
          label="Monto ($)"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={e => setAmount(Number(e.target.value))}
        />
        <Input
          label="Descripción"
          placeholder="Detalle..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          required
        />
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" loading={loading} className="flex-1">Guardar</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>('analytics')
  const [payAccount, setPayAccount] = useState<any>(null)
  const [showTxModal, setShowTxModal] = useState(false)

  const { data: receivable = [] } = useAccountsReceivable()
  const { data: payable = [] } = useAccountsPayable()
  const { data: transactions = [] } = useTransactions()

  const payReceivable = usePayReceivable()
  const payPayable = usePayPayable()
  const createTransaction = useCreateTransaction()

  const totalReceivable = receivable.reduce((s: number, a: any) => s + a.pending, 0)
  const totalPayable = payable.reduce((s: number, a: any) => s + a.pending, 0)

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'analytics', label: 'Análisis' },
    { key: 'receivable', label: 'A cobrar', count: receivable.length },
    { key: 'payable', label: 'A pagar', count: payable.length },
    { key: 'transactions', label: 'Movimientos' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Resumen rápido (siempre visible) */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-2 text-green-600">
            <TrendingUp size={16} />
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Por cobrar</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-slate-100">{formatCurrency(totalReceivable)}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-2 text-red-500">
            <TrendingDown size={16} />
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Por pagar</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-slate-100">{formatCurrency(totalPayable)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-xl mb-4 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 min-w-max flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                tab === t.key ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : 'bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-slate-300'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Analytics */}
      {tab === 'analytics' && <AnalyticsTab />}

      {/* Cuentas a cobrar */}
      {tab === 'receivable' && (
        <div className="space-y-2">
          {receivable.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400 dark:text-slate-500">Sin cuentas a cobrar</div>
          ) : (
            receivable.map((account: any) => (
              <div key={account.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{account.clientName}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      Venta #{account.saleNumber}
                      {account.dueDate && ` · Vence ${formatDate(account.dueDate)}`}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                      Total: {formatCurrency(account.amount)} ·
                      Pagado: {formatCurrency(account.amountPaid)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold text-amber-600">
                      {formatCurrency(account.pending)}
                    </div>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => setPayAccount({ ...account, type: 'receivable' })}
                    >
                      <CheckCircle size={13} /> Cobrar
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Cuentas a pagar */}
      {tab === 'payable' && (
        <div className="space-y-2">
          {payable.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400 dark:text-slate-500">Sin cuentas a pagar</div>
          ) : (
            payable.map((account: any) => (
              <div key={account.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{account.supplierName}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      Compra #{account.purchaseNumber}
                      {account.dueDate && ` · Vence ${formatDate(account.dueDate)}`}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                      Total: {formatCurrency(account.amount)} ·
                      Pagado: {formatCurrency(account.amountPaid)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold text-red-500">
                      {formatCurrency(account.pending)}
                    </div>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => setPayAccount({ ...account, type: 'payable' })}
                    >
                      <CheckCircle size={13} /> Pagar
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Transacciones */}
      {tab === 'transactions' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowTxModal(true)}>
              <Plus size={14} /> Manual
            </Button>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400 dark:text-slate-500">Sin movimientos</div>
            ) : (
              transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    tx.type === 'INCOME' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {tx.type === 'INCOME'
                      ? <TrendingUp size={14} className="text-green-600" />
                      : <TrendingDown size={14} className="text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{tx.description}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">{tx.category} · {formatDate(tx.date)}</div>
                  </div>
                  <div className={`text-sm font-bold shrink-0 ${
                    tx.type === 'INCOME' ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal pago */}
      {payAccount && (
        <PayModal
          open={!!payAccount}
          onClose={() => setPayAccount(null)}
          account={payAccount}
          type={payAccount.type}
          onPay={async (amount, notes) => {
            if (payAccount.type === 'receivable') {
              await payReceivable.mutateAsync({ id: payAccount.id, amount, notes })
            } else {
              await payPayable.mutateAsync({ id: payAccount.id, amount, notes })
            }
          }}
        />
      )}

      {/* Modal transacción manual */}
      <TransactionModal
        open={showTxModal}
        onClose={() => setShowTxModal(false)}
        onSave={async (data) => {
          await createTransaction.mutateAsync(data)
        }}
      />
    </div>
  )
}
