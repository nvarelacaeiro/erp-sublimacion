'use client'
import { useState } from 'react'
import { useClients } from '@/hooks/useClients'
import { useProducts } from '@/hooks/useProducts'
import { formatCurrency } from '@/lib/utils'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ProductLineItem } from '@/components/shared/ProductLineItem'

interface LineItem {
  productId: string | null
  description: string
  quantity: number
  unitPrice: number
}

interface QuoteFormProps {
  onSave: (data: any) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function QuoteForm({ onSave, onCancel, loading }: QuoteFormProps) {
  const [clientId, setClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [discount, setDiscount] = useState(0)
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([
    { productId: null, description: '', quantity: 1, unitPrice: 0 },
  ])
  const [productSearch, setProductSearch] = useState<Record<number, string>>({})
  const [showProductSearch, setShowProductSearch] = useState<number>(-1)
  const [formError, setFormError] = useState('')

  const { data: clients = [] } = useClients(clientSearch || undefined)
  const { data: products = [] } = useProducts({
    search: showProductSearch >= 0 ? (productSearch[showProductSearch] || undefined) : undefined,
  })

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const discountAmount = subtotal * (discount / 100)
  const total = subtotal - discountAmount

  function addItem() {
    setItems(prev => [...prev, { productId: null, description: '', quantity: 1, unitPrice: 0 }])
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof LineItem, value: any) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function selectProduct(idx: number, product: any) {
    setItems(prev => prev.map((item, i) =>
      i === idx
        ? { ...item, productId: product.id, description: product.name, unitPrice: product.price }
        : item,
    ))
    setShowProductSearch(-1)
    setProductSearch(prev => ({ ...prev, [idx]: '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (items.some(i => !i.description || i.quantity <= 0)) return
    try {
      await onSave({
        clientId: clientId || null,
        discount,
        notes: notes || null,
        items: items.map(i => ({
          productId: i.productId || null,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      })
    } catch (err: any) {
      setFormError(err?.message ?? 'Error al guardar el presupuesto')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Cliente */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Cliente</label>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={clientSearch}
            onChange={e => { setClientSearch(e.target.value); setClientId('') }}
            placeholder="Buscar cliente (opcional)..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        {clientSearch && !clientId && clients.length > 0 && (
          <div className="border border-gray-200 rounded-lg bg-white shadow-sm divide-y max-h-40 overflow-y-auto">
            {clients.slice(0, 6).map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => { setClientId(c.id); setClientSearch(c.name) }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50"
              >
                {c.name}
                {c.phone && <span className="text-gray-400 ml-2">{c.phone}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Productos / Servicios</label>
          <button
            type="button"
            onClick={addItem}
            className="text-xs text-primary-600 hover:underline flex items-center gap-1"
          >
            <Plus size={13} /> Agregar línea
          </button>
        </div>

        {items.map((item, idx) => (
          <ProductLineItem
            key={idx}
            item={item}
            idx={idx}
            itemsCount={items.length}
            productSearch={productSearch}
            showProductSearch={showProductSearch}
            products={products}
            onUpdate={updateItem}
            onRemove={removeItem}
            onFocusSearch={setShowProductSearch}
            onChangeSearch={(i, v) => setProductSearch(prev => ({ ...prev, [i]: v }))}
            onSelectProduct={selectProduct}
          />
        ))}
      </div>

      {/* Totales */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-600">Descuento (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={discount}
            onChange={e => setDiscount(Number(e.target.value))}
            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm text-red-500">
            <span>Descuento {discount}%</span>
            <span>-{formatCurrency(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Notas (opcional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Condiciones, aclaraciones..."
          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>

      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {formError}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" loading={loading} className="flex-1">
          Guardar presupuesto
        </Button>
      </div>
    </form>
  )
}
