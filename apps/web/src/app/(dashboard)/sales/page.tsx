'use client'
import { useState } from 'react'
import { useSales, useCancelSale } from '@/hooks/useSales'
import { formatCurrency, formatDate, SALE_STATUS_LABELS, SALE_STATUS_COLORS, PAYMENT_METHOD_LABELS } from '@/lib/utils'
import { DollarSign, XCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/shared/Badge'
import { EmptyState } from '@/components/shared/EmptyState'

export default function SalesPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data: sales = [], isLoading } = useSales({
    from: from || undefined,
    to: to || undefined,
  })
  const cancelSale = useCancelSale()

  async function handleCancel(id: string, number: number) {
    if (!confirm(`¿Cancelar venta #${number}? Se revertirá el stock.`)) return
    await cancelSale.mutateAsync(id)
  }

  const totalMonth = sales
    .filter(s => s.status !== 'CANCELLED')
    .reduce((sum, s) => sum + s.total, 0)

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Filtros de fecha */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          type="date"
          value={from}
          onChange={e => setFrom(e.target.value)}
          className="text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
        />
        <span className="text-sm text-gray-400">a</span>
        <input
          type="date"
          value={to}
          onChange={e => setTo(e.target.value)}
          className="text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
        />
        {(from || to) && (
          <button
            onClick={() => { setFrom(''); setTo('') }}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Limpiar
          </button>
        )}
        <div className="flex-1" />
        <Link href="/sales/new">
          <Button>Nueva venta</Button>
        </Link>
      </div>

      {/* Resumen */}
      {sales.length > 0 && (
        <div className="bg-primary-50 dark:bg-primary-600/10 border border-primary-100 dark:border-primary-600/30 rounded-xl px-4 py-3 mb-4 flex justify-between items-center">
          <span className="text-sm text-primary-700 font-medium">
            {sales.filter(s => s.status !== 'CANCELLED').length} ventas
          </span>
          <span className="text-base font-bold text-primary-700">
            {formatCurrency(totalMonth)}
          </span>
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-white dark:bg-slate-800 rounded-xl border animate-pulse" />
          ))}
        </div>
      ) : sales.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="Sin ventas"
          description="Registrá tu primera venta o convertí un presupuesto."
          action={<Link href="/sales/new"><Button>Nueva venta</Button></Link>}
        />
      ) : (
        <div className="space-y-2">
          {sales.map(sale => (
            <div key={sale.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">#{sale.number}</span>
                    <Badge
                      label={SALE_STATUS_LABELS[sale.status]}
                      className={SALE_STATUS_COLORS[sale.status]}
                    />
                    <span className="text-xs text-gray-500">
                      {PAYMENT_METHOD_LABELS[sale.paymentMethod]}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-slate-300">
                    {sale.clientName ?? 'Sin cliente'}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {formatDate(sale.date)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base font-bold text-gray-900 dark:text-slate-100">
                    {formatCurrency(sale.total)}
                  </div>
                  {sale.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleCancel(sale.id, sale.number)}
                      className="mt-1 text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 ml-auto"
                    >
                      <XCircle size={12} /> Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
