'use client'
import { useState, useCallback } from 'react'
import { useClients } from '@/hooks/useClients'
import { useProducts } from '@/hooks/useProducts'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2, Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

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
  const [showProductSearch, setShowProductSearch] = useState<number | null>(null)

  const { data: clients = [] } = useClients(clientSearch || undefined)
  const { data: products = [] } = useProducts({
    search: showProductSearch !== null ? (productSearch[showProductSearch] || undefined) : undefined,
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
    setShowProductSearch(null)
    setProductSearch(prev => ({ ...prev, [idx]: '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (items.some(i => !i.description || i.quantity <= 0)) return

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

        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="border border-gray-200 rounded-xl p-3 space-y-2">
              {/* Búsqueda de producto */}
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
                  placeholder="Descripción o buscar producto..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
                {showProductSearch === idx && products.length > 0 && (productSearch[idx] ?? '').length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 border border-gray-200 rounded-lg bg-white shadow-lg max-h-44 overflow-y-auto">
                    {products.slice(0, 6).map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={() => selectProduct(idx, p)}
                        className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex justify-between items-center text-sm"
                      >
                        <span>{p.name}</span>
                        <span className="text-primary-600 font-medium">{formatCurrency(p.price)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Cantidad + precio */}
              <div className="grid grid-cols-3 gap-2 items-end">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Cantidad</label>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Precio unit.</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={e => updateItem(idx, 'unitPrice', Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
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
      </div>

      {/* Descuento y totales */}
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

      {/* Botones */}
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
