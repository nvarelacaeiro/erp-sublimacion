'use client'
import { useState } from 'react'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useProducts } from '@/hooks/useProducts'
import { formatCurrency } from '@/lib/utils'
import { Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface PurchaseFormItem {
  productId: string | null
  description: string
  quantity: number
  unitCost: number
}

interface PurchaseFormProps {
  onSave: (data: any) => Promise<void>
  onCancel: () => void
  loading?: boolean
  initialItems?: PurchaseFormItem[]
  initialNotes?: string
}

export function PurchaseForm({
  onSave,
  onCancel,
  loading,
  initialItems,
  initialNotes = '',
}: PurchaseFormProps) {
  const [supplierId, setSupplierId] = useState('')
  const [supplierSearch, setSupplierSearch] = useState('')
  const [paid, setPaid] = useState(true)
  const [notes, setNotes] = useState(initialNotes)
  const [items, setItems] = useState<PurchaseFormItem[]>(
    initialItems ?? [{ productId: null, description: '', quantity: 1, unitCost: 0 }],
  )
  const [productSearch, setProductSearch] = useState<Record<number, string>>({})
  const [showProductSearch, setShowProductSearch] = useState<number>(-1)
  const [formError, setFormError] = useState('')

  const { data: suppliers = [] } = useSuppliers(supplierSearch || undefined)
  const { data: products = [] } = useProducts({
    search: showProductSearch >= 0 ? (productSearch[showProductSearch] || undefined) : undefined,
  })

  const total = items.reduce((s, i) => s + i.quantity * i.unitCost, 0)

  function updateItem(idx: number, field: keyof PurchaseFormItem, value: any) {
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
        <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Proveedor</label>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={supplierSearch}
            onChange={e => { setSupplierSearch(e.target.value); setSupplierId('') }}
            placeholder="Buscar proveedor (opcional)..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>
        {supplierSearch && !supplierId && suppliers.length > 0 && (
          <div className="border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 shadow-sm divide-y dark:divide-slate-700 max-h-40 overflow-y-auto">
            {suppliers.slice(0, 5).map((s: any) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setSupplierId(s.id); setSupplierSearch(s.name) }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 dark:text-slate-200"
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
          <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Productos comprados</label>
          <button
            type="button"
            onClick={() => setItems(prev => [...prev, { productId: null, description: '', quantity: 1, unitCost: 0 }])}
            className="text-xs text-primary-600 hover:underline flex items-center gap-1"
          >
            <Plus size={13} /> Agregar
          </button>
        </div>

        {items.map((item, idx) => (
          <div key={idx} className="border border-gray-200 dark:border-slate-600 rounded-xl p-3 space-y-2">
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
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
              />
              {showProductSearch === idx && products.length > 0 && (productSearch[idx] ?? '').length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 shadow-lg max-h-44 overflow-y-auto">
                  {products.slice(0, 6).map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={() => selectProduct(idx, p)}
                      className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 dark:text-slate-200 flex justify-between text-sm"
                    >
                      <span>{p.name}</span>
                      <span className="text-gray-500 dark:text-slate-400">Costo: {formatCurrency(p.cost)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 items-end">
              <div>
                <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Cantidad</label>
                <input
                  type="number" min="1" step="1"
                  value={item.quantity}
                  onChange={e => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Costo unit.</label>
                <input
                  type="number" min="0" step="0.01"
                  value={item.unitCost}
                  onChange={e => updateItem(idx, 'unitCost', Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold dark:text-slate-100">{formatCurrency(item.quantity * item.unitCost)}</span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 dark:text-slate-500 hover:text-red-500"
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
      <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-4 space-y-3">
        <div className="flex justify-between text-base font-bold text-gray-900 dark:text-slate-100">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={paid}
            onChange={e => setPaid(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500 dark:bg-slate-700"
          />
          <span className="text-sm text-gray-700 dark:text-slate-300">Compra pagada (genera egreso inmediato)</span>
        </label>
        {!paid && (
          <p className="text-xs text-amber-600">
            La compra quedará pendiente. Podés marcarla como pagada después desde el listado.
          </p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-1">Notas</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
          placeholder="Número de remito, factura..."
        />
      </div>

      {formError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">
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
