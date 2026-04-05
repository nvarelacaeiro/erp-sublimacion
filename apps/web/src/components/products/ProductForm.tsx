'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type ProductInput } from '@erp/shared'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Plus, Trash2, Package, TrendingUp } from 'lucide-react'

// Override categoryId locally: empty string → null (avoids silent cuid() validation failure)
const localProductSchema = productSchema.extend({
  categoryId: z.preprocess(
    v => (v === '' ? null : v),
    z.string().min(1).nullable().optional(),
  ),
  price: z.number().min(0).default(0),
})

export interface LocalItem {
  id?: string
  name: string
  cost: number
  type: 'QUANTITY' | 'BOOLEAN'
  toDelete?: boolean
}

export interface LocalRule {
  minQty: number
  maxQty: number | null
  marginPercentage: number
}

export interface ProductFormExtras {
  items: LocalItem[]
  rules: LocalRule[]
}

interface ProductFormProps {
  defaultValues?: Partial<ProductInput> & { id?: string }
  onSave: (data: ProductInput, extras: ProductFormExtras) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function ProductForm({ defaultValues, onSave, onCancel, loading }: ProductFormProps) {
  const productId = defaultValues?.id

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<any[]>('/api/categories'),
  })

  const { data: existingConfig } = useQuery({
    queryKey: ['product-config', productId],
    queryFn: () => api.get<any>(`/api/products/${productId}/items`),
    enabled: !!productId,
  })

  const [formError, setFormError] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<ProductInput>({
    resolver: zodResolver(localProductSchema),
    defaultValues: {
      cost: 0,
      price: 0,
      stock: 0,
      minStock: 0,
      unit: 'un',
      ...defaultValues,
    },
  })

  // ── Items state ─────────────────────────────────────────────
  const [items, setItems] = useState<LocalItem[]>([])
  const [itemsInit, setItemsInit] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemCost, setNewItemCost] = useState(0)
  const [newItemType, setNewItemType] = useState<'QUANTITY' | 'BOOLEAN'>('QUANTITY')

  if (existingConfig && !itemsInit) {
    setItems(
      (existingConfig.items ?? []).map((i: any) => ({
        id: i.id,
        name: i.name,
        cost: Number(i.cost),
        type: i.type,
      })),
    )
    setItemsInit(true)
  }

  // ── Rules state ──────────────────────────────────────────────
  const [rules, setRules] = useState<LocalRule[]>([])
  const [rulesInit, setRulesInit] = useState(false)

  if (existingConfig && !rulesInit) {
    setRules(
      (existingConfig.pricingRules ?? []).map((r: any) => ({
        minQty: r.minQty,
        maxQty: r.maxQty,
        marginPercentage: Number(r.marginPercentage),
      })),
    )
    setRulesInit(true)
  }

  function addItem() {
    if (!newItemName.trim()) return
    setItems(prev => [...prev, { name: newItemName.trim(), cost: newItemCost, type: newItemType }])
    setNewItemName('')
    setNewItemCost(0)
  }

  function removeItem(realIdx: number) {
    setItems(prev => {
      const item = prev[realIdx]
      if (item.id) {
        return prev.map((it, i) => i === realIdx ? { ...it, toDelete: true } : it)
      }
      return prev.filter((_, i) => i !== realIdx)
    })
  }

  function addRule() {
    setRules(prev => [...prev, { minQty: 1, maxQty: null, marginPercentage: 30 }])
  }

  function removeRule(idx: number) {
    setRules(prev => prev.filter((_, i) => i !== idx))
  }

  function updateRule(idx: number, field: keyof LocalRule, value: any) {
    setRules(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  async function onSubmit(data: ProductInput) {
    setFormError('')
    try {
      await onSave(data, { items, rules })
    } catch (err: any) {
      setFormError(err?.message ?? 'Error al guardar el producto')
    }
  }

  const visibleItems = items.filter(i => !i.toDelete)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="divide-y divide-gray-100 max-h-[80vh] overflow-y-auto">

      {/* ── SECCIÓN 1: Datos básicos ──────────────────────────── */}
      <div className="p-5 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Datos del producto</p>

        <Input
          label="Nombre *"
          placeholder="Ej: Remera Sublimable Blanca"
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input label="SKU" placeholder="Ej: CAM-001" {...register('sku')} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Categoría</label>
            <select
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              {...register('categoryId')}
            >
              <option value="">Sin categoría</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Costo base ($) *"
            type="number"
            step="0.01"
            min="0"
            error={errors.cost?.message}
            {...register('cost', { valueAsNumber: true })}
          />
          <Input
            label="Stock actual"
            type="number"
            step="1"
            min="0"
            {...register('stock', { valueAsNumber: true })}
          />
          <Input
            label="Stock mínimo"
            type="number"
            step="1"
            min="0"
            hint="Alerta"
            {...register('minStock', { valueAsNumber: true })}
          />
        </div>

        <div className="w-1/2">
          <Input label="Unidad" placeholder="un, kg, m..." {...register('unit')} />
        </div>
      </div>

      {/* ── SECCIÓN 2: Ítems configurables ───────────────────── */}
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Package size={14} className="text-primary-600" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Extras / Ítems configurables</p>
        </div>

        {visibleItems.length > 0 && (
          <div className="space-y-1.5">
            {items.map((item, idx) => item.toDelete ? null : (
              <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-800 flex-1">{item.name}</span>
                <span className="text-xs text-gray-500">${item.cost}</span>
                <span className="text-xs text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5">
                  {item.type === 'BOOLEAN' ? 'Sí/No' : 'Cantidad'}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="p-1 text-gray-400 hover:text-red-500 rounded"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Nombre del ítem</label>
              <input
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                placeholder="Ej: Estampa delantera"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
              />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Costo ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newItemCost}
                onChange={e => setNewItemCost(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
              <select
                value={newItemType}
                onChange={e => setNewItemType(e.target.value as 'QUANTITY' | 'BOOLEAN')}
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="QUANTITY">Cantidad</option>
                <option value="BOOLEAN">Sí/No</option>
              </select>
            </div>
            <button
              type="button"
              onClick={addItem}
              disabled={!newItemName.trim()}
              className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 disabled:opacity-40 shrink-0"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── SECCIÓN 3: Escalas de precio ─────────────────────── */}
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-primary-600" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Escalas de precio</p>
          </div>
          <button
            type="button"
            onClick={addRule}
            className="text-xs text-primary-600 hover:underline flex items-center gap-1"
          >
            <Plus size={12} /> Agregar escala
          </button>
        </div>

        {rules.length === 0 ? (
          <p className="text-xs text-gray-400">Sin escalas — se usará el precio base del producto.</p>
        ) : (
          <div className="space-y-2">
            {rules.map((rule, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg px-3 py-2 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500">Cant. de</span>
                  <input
                    type="number" min="1" step="1"
                    value={rule.minQty}
                    onChange={e => updateRule(idx, 'minQty', parseInt(e.target.value) || 1)}
                    className="w-16 px-2 py-1 text-sm border border-gray-200 rounded text-center bg-white"
                  />
                  <span className="text-xs text-gray-500">a</span>
                  <input
                    type="number" min="1" step="1"
                    value={rule.maxQty ?? ''}
                    placeholder="∞"
                    onChange={e => updateRule(idx, 'maxQty', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-16 px-2 py-1 text-sm border border-gray-200 rounded text-center bg-white"
                  />
                  <span className="text-xs text-gray-500">un</span>
                  <span className="text-xs text-gray-500 ml-auto sm:ml-0">Margen</span>
                  <input
                    type="number" min="0" step="1"
                    value={rule.marginPercentage}
                    onChange={e => updateRule(idx, 'marginPercentage', Number(e.target.value))}
                    className="w-20 px-2 py-1 text-sm border border-gray-200 rounded text-right bg-white"
                  />
                  <span className="text-xs text-gray-500">%</span>
                  <button
                    type="button"
                    onClick={() => removeRule(idx)}
                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Error ────────────────────────────────────────────── */}
      {formError && (
        <div className="mx-5 mb-1 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {formError}
        </div>
      )}

      {/* ── Acciones ─────────────────────────────────────────── */}
      <div className="p-5 flex gap-3 bg-white sticky bottom-0">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" loading={loading} className="flex-1">
          {productId ? 'Guardar cambios' : 'Crear producto'}
        </Button>
      </div>
    </form>
  )
}
