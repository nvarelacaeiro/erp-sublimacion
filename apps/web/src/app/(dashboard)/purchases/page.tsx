'use client'
import { useState } from 'react'
import { usePurchases, useCreatePurchase, useMarkPurchasePaid } from '@/hooks/usePurchases'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useProducts } from '@/hooks/useProducts'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ShoppingCart, Plus, Trash2, Search, CheckCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/shared/EmptyState'

interface PurchaseItem {
  productId: string | null
  description: string
  quantity: number
  unitCost: number
}

function PurchaseForm({
  onSave,
  onCancel,
  loading,
}: {
  onSave: (data: any) => Promise<void>
  onCancel: () => void
  loading?: boolean
}) {
  const [supplierId, setSupplierId] = useState('')
  const [supplierSearch, setSupplierSearch] = useState('')
  const [paid, setPaid] = useState(true)
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<PurchaseItem[]>([
    { productId: null, description: '', quantity: 1, unitCost: 0 },
  ])
  const [productSearch, setProductSearch] = useState<Record<number, string>>({})
  const [showProductSearch, setShowProductSearch] = useState<number>(-1)
  const [formError, setFormError] = useState('')

  const { data: suppliers = [] } = useSuppliers(supplierSearch || undefined)
  const { data: products = [] } = useProducts({
    search: showProductSearch >= 0 ? (productSearch[showProductSearch] || undefined) : undefined,
  })

  const total = items.reduce((s, i) => s + i.quantity * i.unitCost, 0)

  function updateItem(idx: number, field: keyof PurchaseItem, value: any) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function selectProduct(idx: number, product: any) {
    setItems(prev => prev.map((item, i) =>
      i === idx
        ? { ...item, productId: product.id, description: product.name, unitCost: product.cost }
        : item,
    ))
    setShowProductSearch(-1)
    setProductSearch(prev => ({ ...prev, [idx]: '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    try {
      await onSave({
        supplierId: supplierId || null,
        paid,
        notes: notes || null,
        items: items.map(i => ({
          productId: i.productId || null,
          description: i.description,
          quantity: i.quantity,
          unitCost: i.unitCost,
        })),
      })
    } catch (err: any) {
      setFormError(err?.message ?? 'Error al registrar la compra')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-5">
      {/* Proveedor */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Proveedor</label>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={supplierSearch}
            onChange={e => { setSupplierSearch(e.target.value); setSupplierId('') }}
            placeholder="Buscar proveedor (opcional)..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        {supplierSearch && !supplierId && suppliers.length > 0 && (
          <div className="border border-gray-200 rounded-lg bg-white shadow-sm divide-y max-h-40 overflow-y-auto">
            {suppliers.slice(0, 5).map((s: any) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setSupplierId(s.id); setSupplierSearch(s.name) }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50"
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Productos comprados</label>
          <button
            type="button"
            onClick={() => setItems(prev => [...prev, { productId: null, description: '', quantity: 1, unitCost: 0 }])}
            className="text-xs text-primary-600 hover:underline flex items-center gap-1"
          >
            <Plus size={13} /> Agregar
          </button>
        </div>

        {items.map((item, idx) => (
          <div key={idx} className="border border-gray-200 rounded-xl p-3 space-y-2">
            <div className="relative">
              <input
                value={showProductSearch === idx ? (productSearch[idx] ?? '') : item.description}
                onChange={e => {
                  setShowProductSearch(idx)
                  setProductSearch(prev => ({ ...prev, [idx]: e.target.value }))
                  updateItem(idx, 'description', e.target.value)
                  updateItem(idx, 'productId', null)
                }}
                onFocus={() => setShowProductSearch(idx)}
                onBlur={() => setTimeout(() => setShowProductSearch(-1), 150)}
                placeholder="Descripción o buscar producto..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {showProductSearch === idx && products.length > 0 && (productSearch[idx] ?? '').length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 border border-gray-200 rounded-lg bg-white shadow-lg max-h-44 overflow-y-auto">
                  {products.slice(0, 6).map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={() => selectProduct(idx, p)}
                      className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex justify-between text-sm"
                    >
                      <span>{p.name}</span>
                      <span className="text-gray-500">Costo: {formatCurrency(p.cost)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 items-end">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Cantidad</label>
                <input
                  type="number" min="1" step="1"
                  value={item.quantity}
                  onChange={e => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Costo unit.</label>
                <input
                  type="number" min="0" step="0.01"
                  value={item.unitCost}
                  onChange={e => updateItem(idx, 'unitCost', Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{formatCurrency(item.quantity * item.unitCost)}</span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total + estado de pago */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <div className="flex justify-between text-base font-bold text-gray-900">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={paid}
            onChange={e => setPaid(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">Compra pagada (genera egreso inmediato)</span>
        </label>
        {!paid && (
          <p className="text-xs text-amber-600">
            La compra quedará pendiente. Podés marcarla como pagada después desde el listado.
          </p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Notas</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          placeholder="Número de remito, factura..."
        />
      </div>

      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {formError}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">Cancelar</Button>
        <Button type="submit" loading={loading} className="flex-1">Registrar compra</Button>
      </div>
    </form>
  )
}

export default function PurchasesPage() {
  const [showForm, setShowForm] = useState(false)
  const { data: purchases = [], isLoading } = usePurchases()
  const createPurchase = useCreatePurchase()
  const markPaid = useMarkPurchasePaid()

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
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowForm(true)}>Nueva compra</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl border animate-pulse" />
          ))}
        </div>
      ) : purchases.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Sin compras"
          description="Registrá tu primera compra a un proveedor."
          action={<Button onClick={() => setShowForm(true)}>Nueva compra</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {purchases.map((p: any) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">#{p.number}</span>
                  {p.supplierName && (
                    <span className="text-sm text-gray-600">{p.supplierName}</span>
                  )}
                  {p.status === 'PENDING' ? (
                    <span className="flex items-center gap-0.5 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                      <Clock size={10} /> Pendiente
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                      <CheckCircle size={10} /> Pagada
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{formatDate(p.date)}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-bold text-gray-900">{formatCurrency(p.total)}</span>
                {p.status === 'PENDING' && (
                  <button
                    onClick={() => handleMarkPaid(p.id)}
                    disabled={markPaid.isPending}
                    className="text-xs px-2 py-1 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 disabled:opacity-50"
                  >
                    Marcar pagada
                  </button>
                )}
              </div>
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
