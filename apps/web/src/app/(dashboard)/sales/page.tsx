'use client'
import { useState } from 'react'
import { useSales, useCancelSale } from '@/hooks/useSales'
import { formatCurrency, formatDate, SALE_STATUS_LABELS, SALE_STATUS_COLORS, PAYMENT_METHOD_LABELS } from '@/lib/utils'
import { DollarSign, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/shared/Badge'
import { EmptyState } from '@/components/shared/EmptyState'

export default function SalesPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState('')

  const { data: sales = [], isLoading } = useSales({
    from: from || undefined,
    to: to || undefined,
  })
  const cancelSale = useCancelSale()

  async function handleCancel(id: string, number: number) {
    if (!confirm(`¿Cancelar venta #${number}? Se revertirá el stock.`)) return
    setCancelError('')
    try {
      await cancelSale.mutateAsync(id)
    } catch (err: any) {
      setCancelError(err?.message ?? 'Error al cancelar la venta')
    }
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
        <span className="text-sm text-gray-400 dark:text-slate-500">a</span>
        <input
          type="date"
          value={to}
          onChange={e => setTo(e.target.value)}
          className="text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
        />
        {(from || to) && (
          <button
            onClick={() => { setFrom(''); setTo('') }}
            className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
          >
            Limpiar
          </button>
        )}
        <div className="flex-1" />
        <Link href="/sales/new">
          <Button>Nueva venta</Button>
        </Link>
      </div>

      {/* Error cancelación */}
      {cancelError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
          {cancelError}
        </div>
      )}

      {/* Resumen */}
      {sales.length > 0 && (
        <div className="bg-primary-50 dark:bg-primary-600/10 border border-primary-100 dark:border-primary-600/30 rounded-xl px-4 py-3 mb-4 flex justify-between items-center">
          <span className="text-sm text-primary-700 dark:text-primary-400 font-medium">
            {sales.filter(s => s.status !== 'CANCELLED').length} ventas
          </span>
          <span className="text-base font-bold text-primary-700 dark:text-primary-400">
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
          {sales.map((sale: any) => (
            <div key={sale.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              {/* Cabecera */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">#{sale.number}</span>
                    <Badge
                      label={SALE_STATUS_LABELS[sale.status]}
                      className={SALE_STATUS_COLORS[sale.status]}
                    />
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                      {PAYMENT_METHOD_LABELS[sale.paymentMethod]}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-slate-300">
                    {sale.clientName ?? 'Sin cliente'}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                    {formatDate(sale.date)}
                    {sale.userName && ` · ${sale.userName}`}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="text-base font-bold text-gray-900 dark:text-slate-100">
                    {formatCurrency(sale.total)}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-slate-200 dark:hover:bg-slate-700"
                      title="Ver detalle"
                    >
                      {expandedId === sale.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {sale.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleCancel(sale.id, sale.number)}
                        disabled={cancelSale.isPending}
                        className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                        title="Cancelar venta"
                      >
                        <XCircle size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Detalle expandible */}
              {expandedId === sale.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                  {sale.items?.length > 0 ? (
                    <div className="space-y-2">
                      {/* Encabezado columnas */}
                      <div className="grid grid-cols-12 text-xs text-gray-400 dark:text-slate-500 px-1">
                        <span className="col-span-6">Producto</span>
                        <span className="col-span-2 text-right">Cant.</span>
                        <span className="col-span-2 text-right">P. unit.</span>
                        <span className="col-span-2 text-right">Total</span>
                      </div>
                      {sale.items.map((item: any, i: number) => (
                        <div key={i} className="grid grid-cols-12 text-sm items-start px-1 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50">
                          <div className="col-span-6 text-gray-800 dark:text-slate-200 pr-2">
                            {item.description}
                            {item.product?.sku && (
                              <span className="text-xs text-gray-400 dark:text-slate-500 ml-1">({item.product.sku})</span>
                            )}
                          </div>
                          <div className="col-span-2 text-right text-gray-600 dark:text-slate-400">
                            ×{Number(item.quantity).toFixed(Number(item.quantity) % 1 === 0 ? 0 : 2)}
                          </div>
                          <div className="col-span-2 text-right text-gray-600 dark:text-slate-400">
                            {formatCurrency(item.unitPrice)}
                          </div>
                          <div className="col-span-2 text-right font-medium text-gray-900 dark:text-slate-100">
                            {formatCurrency(item.total)}
                          </div>
                        </div>
                      ))}

                      {/* Totales */}
                      <div className="border-t border-gray-100 dark:border-slate-700 pt-2 mt-1 space-y-1">
                        {Number(sale.discount) > 0 && (
                          <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 px-1">
                            <span>Subtotal</span>
                            <span>{formatCurrency(sale.subtotal)}</span>
                          </div>
                        )}
                        {Number(sale.discount) > 0 && (
                          <div className="flex justify-between text-xs text-red-500 dark:text-red-400 px-1">
                            <span>Descuento</span>
                            <span>-{formatCurrency(sale.discount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-semibold text-gray-900 dark:text-slate-100 px-1">
                          <span>Total</span>
                          <span>{formatCurrency(sale.total)}</span>
                        </div>
                      </div>

                      {sale.notes && (
                        <div className="text-xs text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 mt-1">
                          {sale.notes}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-2">Sin ítems</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
