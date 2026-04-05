'use client'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useProductPrice } from '@/hooks/useProductPrice'
import { formatCurrency } from '@/lib/utils'
import { Trash2, Zap } from 'lucide-react'

interface LineItem {
  productId: string | null
  description: string
  quantity: number
  unitPrice: number
}

interface ConfigItem {
  id: string
  name: string
  cost: number
  type: 'QUANTITY' | 'BOOLEAN'
}

interface ProductLineItemProps {
  item: LineItem
  idx: number
  itemsCount: number
  productSearch: Record<number, string>
  showProductSearch: number
  products: any[]
  onUpdate: (idx: number, field: keyof LineItem, value: any) => void
  onRemove: (idx: number) => void
  onFocusSearch: (idx: number) => void
  onChangeSearch: (idx: number, value: string) => void
  onSelectProduct: (idx: number, product: any) => void
}

export function ProductLineItem({
  item,
  idx,
  itemsCount,
  productSearch,
  showProductSearch,
  products,
  onUpdate,
  onRemove,
  onFocusSearch,
  onChangeSearch,
  onSelectProduct,
}: ProductLineItemProps) {
  const [selectedExtras, setSelectedExtras] = useState<{ itemId: string; qty: number }[]>([])
  const [autoPrice, setAutoPrice] = useState(false)

  // Fetch configurable items for selected product
  const { data: productConfig } = useQuery({
    queryKey: ['product-config', item.productId],
    queryFn: () => api.get<{ items: ConfigItem[]; pricingRules: any[] }>(`/api/products/${item.productId}/items`),
    enabled: !!item.productId,
    staleTime: 5 * 60 * 1000,
  })

  const configItems = productConfig?.items ?? []

  const { result } = useProductPrice(item.productId, item.quantity, selectedExtras)

  // Auto-fill price when calculation returns
  useEffect(() => {
    if (result && result.unitPrice > 0) {
      onUpdate(idx, 'unitPrice', result.unitPrice)
      setAutoPrice(true)
    }
  }, [result])

  // Reset extras and auto-price when product changes
  useEffect(() => {
    setSelectedExtras([])
    setAutoPrice(false)
  }, [item.productId])

  function updateExtra(itemId: string, qty: number) {
    setSelectedExtras(prev => {
      const without = prev.filter(x => x.itemId !== itemId)
      return qty > 0 ? [...without, { itemId, qty }] : without
    })
  }

  // Price portions for optional breakdown (no costs, no margins exposed)
  const margin = result?.margin ?? 0
  const multiplier = 1 + margin / 100
  const basePrice = result ? result.baseCost * multiplier : 0
  const extraPrice = result ? result.extraCost * multiplier : 0

  return (
    <div className="border border-gray-200 rounded-xl p-3 space-y-3">
      {/* Product search */}
      <div className="relative">
        <input
          value={showProductSearch === idx ? (productSearch[idx] ?? '') : item.description}
          onChange={e => {
            onFocusSearch(idx)
            onChangeSearch(idx, e.target.value)
            onUpdate(idx, 'description', e.target.value)
            onUpdate(idx, 'productId', null)
            setAutoPrice(false)
            setSelectedExtras([])
          }}
          onFocus={() => onFocusSearch(idx)}
          onBlur={() => setTimeout(() => onFocusSearch(-1), 150)}
          placeholder="Descripción o buscar producto..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {showProductSearch === idx && products.length > 0 && (productSearch[idx] ?? '').length > 0 && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 border border-gray-200 rounded-lg bg-white shadow-lg max-h-44 overflow-y-auto">
            {products.slice(0, 6).map(p => (
              <button
                key={p.id}
                type="button"
                onMouseDown={() => {
                  onSelectProduct(idx, p)
                  setSelectedExtras([])
                  setAutoPrice(false)
                }}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex justify-between items-center text-sm"
              >
                <span>{p.name}</span>
                <span className="text-primary-600 font-medium">{formatCurrency(p.price)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Configurable extras — only when product has items */}
      {item.productId && configItems.length > 0 && (
        <div className="bg-gray-50 rounded-lg px-3 py-2.5 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Extras</p>
          {configItems.map(ci => (
            <div key={ci.id} className="flex items-center gap-2">
              <span className="text-sm text-gray-700 flex-1">{ci.name}</span>
              {ci.type === 'BOOLEAN' ? (
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-primary-600"
                  onChange={e => updateExtra(ci.id, e.target.checked ? 1 : 0)}
                />
              ) : (
                <input
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={0}
                  className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onChange={e => updateExtra(ci.id, Math.max(0, parseInt(e.target.value) || 0))}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quantity + unit price + total */}
      <div className="grid grid-cols-3 gap-2 items-end">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Cantidad</label>
          <input
            type="number"
            min="1"
            step="1"
            value={item.quantity}
            onChange={e => onUpdate(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            Precio unit.
            {autoPrice && (
              <span className="flex items-center gap-0.5 text-primary-600 font-medium">
                <Zap size={10} />Auto
              </span>
            )}
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={item.unitPrice}
            onChange={e => {
              setAutoPrice(false)
              onUpdate(idx, 'unitPrice', Number(e.target.value))
            }}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{formatCurrency(item.quantity * item.unitPrice)}</span>
          {itemsCount > 1 && (
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Simple breakdown — only when auto-calculated and has extras */}
      {autoPrice && result && result.extraCost > 0 && (
        <div className="text-xs text-gray-400 border-t border-gray-100 pt-2 space-y-0.5">
          <div className="flex justify-between">
            <span>Producto base</span>
            <span>{formatCurrency(basePrice)}</span>
          </div>
          <div className="flex justify-between">
            <span>Extras</span>
            <span>{formatCurrency(extraPrice)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
