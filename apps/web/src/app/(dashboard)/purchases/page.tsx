'use client'
import { useState } from 'react'
import { usePurchases, useCreatePurchase, useMarkPurchasePaid } from '@/hooks/usePurchases'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ShoppingCart, Plus, Search, CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/shared/EmptyState'
import { PurchaseForm } from '@/components/shared/PurchaseForm'
import { ExportButton } from '@/components/shared/ExportButton'

export default function PurchasesPage() {
  const [showForm, setShowForm] = useState(false)
  const [supplierFilter, setSupplierFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: purchases = [], isLoading } = usePurchases({
    from: fromDate || undefined,
    to: toDate || undefined,
  })
  const createPurchase = useCreatePurchase()
  const markPaid = useMarkPurchasePaid()

  // Client-side supplier filter
  const filtered = supplierFilter
    ? purchases.filter((p: any) =>
        p.supplierName?.toLowerCase().includes(supplierFilter.toLowerCase()),
      )
    : purchases

  async function handleSave(data: any) {
    await createPurchase.mutateAsync(data)
    setShowForm(false)
  }

  async function handleMarkPaid(id: string) {
    if (!confirm('¿Marcar esta compra como pagada? Se registrará un egreso.')) return
    await markPaid.mutateAsync(id)
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={supplierFilter}
            onChange={e => setSupplierFilter(e.target.value)}
            placeholder="Filtrar por proveedor..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>
        <input
          type="date"
          value={fromDate}
          onChange={e => setFromDate(e.target.value)}
          className="px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
        />
        <input
          type="date"
          value={toDate}
          onChange={e => setToDate(e.target.value)}
          className="px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
        />
        {(supplierFilter || fromDate || toDate) && (
          <button
            onClick={() => { setSupplierFilter(''); setFromDate(''); setToDate('') }}
            className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 px-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            Limpiar
          </button>
        )}
        <ExportButton
          filename="compras"
          sheetName="Compras"
          getData={() => filtered.map((p: any) => ({
            Número: p.number,
            Fecha: new Date(p.date).toLocaleDateString('es-AR'),
            Proveedor: p.supplierName ?? '',
            Estado: p.status,
            Total: p.total,
          }))}
        />
        <Button onClick={() => setShowForm(true)}>Nueva compra</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-white dark:bg-slate-800 rounded-xl border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Sin compras"
          description={supplierFilter || fromDate || toDate ? 'No hay compras con ese filtro.' : 'Registrá tu primera compra a un proveedor.'}
          action={<Button onClick={() => setShowForm(true)}>Nueva compra</Button>}
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
          {filtered.map((p: any) => (
            <div key={p.id} className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">#{p.number}</span>
                    {p.supplierName && (
                      <span className="text-sm text-gray-600 dark:text-slate-400">{p.supplierName}</span>
                    )}
                    {p.status === 'PENDING' ? (
                      <span className="flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full">
                        <Clock size={10} /> Pendiente
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-full">
                        <CheckCircle size={10} /> Pagada
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{formatDate(p.date)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-gray-900 dark:text-slate-100">{formatCurrency(p.total)}</span>
                  {p.status === 'PENDING' && (
                    <button
                      onClick={() => handleMarkPaid(p.id)}
                      disabled={markPaid.isPending}
                      className="text-xs px-2 py-1 rounded-lg bg-primary-50 dark:bg-primary-600/20 text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-600/30 disabled:opacity-50"
                    >
                      Marcar pagada
                    </button>
                  )}
                  {p.items?.length > 0 && (
                    <button
                      onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      title="Ver detalle"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-slate-200 dark:hover:bg-slate-700"
                    >
                      {expandedId === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>
              </div>

              {expandedId === p.id && p.items?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 space-y-1.5">
                  {p.items.map((item: any, i: number) => (
                    <div key={i} className="flex items-start justify-between gap-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-800 dark:text-slate-200">{item.description}</span>
                        <span className="text-gray-400 dark:text-slate-500 ml-1.5">×{item.quantity}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-gray-900 dark:text-slate-100 font-medium">{formatCurrency(Number(item.unitCost) * Number(item.quantity))}</div>
                        <div className="text-xs text-gray-400 dark:text-slate-500">{formatCurrency(Number(item.unitCost))} c/u</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nueva compra" size="lg">
        <PurchaseForm
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
          loading={createPurchase.isPending}
        />
      </Modal>
    </div>
  )
}
