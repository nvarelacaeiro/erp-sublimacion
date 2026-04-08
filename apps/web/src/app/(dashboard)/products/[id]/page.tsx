'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import {
  ArrowLeft, Plus, Trash2, Pencil, Check, X, Tag, TrendingUp, Package,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ProductItem {
  id: string
  name: string
  cost: number
  type: 'QUANTITY' | 'BOOLEAN'
}

interface PricingRule {
  id: string
  minQty: number
  maxQty: number | null
  marginPercentage: number
}

interface ProductConfig {
  items: ProductItem[]
  pricingRules: PricingRule[]
}

function ItemRow({
  item,
  onUpdate,
  onDelete,
}: {
  item: ProductItem
  onUpdate: (id: string, data: Partial<ProductItem>) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [cost, setCost] = useState(item.cost)
  const [type, setType] = useState(item.type)

  async function save() {
    await onUpdate(item.id, { name, cost, type })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-slate-100"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={cost}
          onChange={e => setCost(Number(e.target.value))}
          className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded text-right bg-white dark:bg-slate-800 dark:text-slate-100"
        />
        <select
          value={type}
          onChange={e => setType(e.target.value as 'QUANTITY' | 'BOOLEAN')}
          className="text-sm border border-gray-300 dark:border-slate-600 rounded px-1 py-1 bg-white dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="QUANTITY">Cantidad</option>
          <option value="BOOLEAN">Sí/No</option>
        </select>
        <button onClick={save} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={16} /></button>
        <button onClick={() => setEditing(false)} className="p-1 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><X size={16} /></button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-700">
      <div className="flex-1">
        <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{item.name}</span>
        <span className="ml-2 text-xs text-gray-500 dark:text-slate-400">
          {item.type === 'BOOLEAN' ? '(Sí/No)' : '(Cantidad)'}
        </span>
      </div>
      <span className="text-sm text-gray-700 dark:text-slate-300">{formatCurrency(item.cost)}</span>
      <button onClick={() => setEditing(true)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400"><Pencil size={14} /></button>
      <button onClick={() => onDelete(item.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
    </div>
  )
}

function PricingRuleRow({
  rule,
  onChange,
  onDelete,
}: {
  rule: PricingRule & { _new?: boolean }
  onChange: (id: string, field: keyof PricingRule, value: any) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-slate-700">
      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-slate-300">
        <span>de</span>
        <input
          type="number"
          min="1"
          step="1"
          value={rule.minQty}
          onChange={e => onChange(rule.id, 'minQty', parseInt(e.target.value) || 1)}
          className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded text-center bg-white dark:bg-slate-800 dark:text-slate-100"
        />
        <span>a</span>
        <input
          type="number"
          min="1"
          step="1"
          value={rule.maxQty ?? ''}
          placeholder="∞"
          onChange={e => onChange(rule.id, 'maxQty', e.target.value ? parseInt(e.target.value) : null)}
          className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded text-center bg-white dark:bg-slate-800 dark:text-slate-100"
        />
        <span>unidades</span>
      </div>
      <div className="flex items-center gap-1 ml-auto">
        <span className="text-sm text-gray-600 dark:text-slate-300">Margen:</span>
        <input
          type="number"
          min="0"
          step="1"
          value={rule.marginPercentage}
          onChange={e => onChange(rule.id, 'marginPercentage', Number(e.target.value))}
          className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded text-right bg-white dark:bg-slate-800 dark:text-slate-100"
        />
        <span className="text-sm text-gray-600 dark:text-slate-300">%</span>
      </div>
      <button onClick={() => onDelete(rule.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 ml-2"><Trash2 size={14} /></button>
    </div>
  )
}

export default function ProductConfigPage() {
  const { id: productId } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const { data: product } = useQuery({
    queryKey: ['products', productId],
    queryFn: () => api.get<any>(`/api/products/${productId}`),
  })

  const { data: config, isLoading } = useQuery({
    queryKey: ['product-config', productId],
    queryFn: () => api.get<ProductConfig>(`/api/products/${productId}/items`),
    enabled: !!productId,
  })

  // ── Items state ────────────────────────────────────────────
  const [newItemName, setNewItemName] = useState('')
  const [newItemCost, setNewItemCost] = useState(0)
  const [newItemType, setNewItemType] = useState<'QUANTITY' | 'BOOLEAN'>('QUANTITY')
  const [itemError, setItemError] = useState('')

  const addItem = useMutation({
    mutationFn: (data: any) => api.post(`/api/products/${productId}/items`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-config', productId] })
      setNewItemName('')
      setNewItemCost(0)
      setItemError('')
    },
    onError: (e: any) => setItemError(e.message),
  })

  const updateItem = useMutation({
    mutationFn: ({ itemId, data }: any) => api.put(`/api/products/${productId}/items/${itemId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-config', productId] }),
  })

  const deleteItem = useMutation({
    mutationFn: (itemId: string) => api.delete(`/api/products/${productId}/items/${itemId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-config', productId] }),
  })

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newItemName.trim()) return
    addItem.mutate({ name: newItemName.trim(), cost: newItemCost, type: newItemType })
  }

  // ── Pricing rules local state ──────────────────────────────
  const [rules, setRules] = useState<(PricingRule & { _new?: boolean })[]>([])
  const [rulesDirty, setRulesDirty] = useState(false)
  const [ruleError, setRuleError] = useState('')

  useEffect(() => {
    if (config?.pricingRules) {
      setRules(config.pricingRules)
      setRulesDirty(false)
    }
  }, [config])

  function addRule() {
    const id = `new-${Date.now()}`
    setRules(prev => [...prev, { id, minQty: 1, maxQty: null, marginPercentage: 30, _new: true }])
    setRulesDirty(true)
  }

  function changeRule(id: string, field: keyof PricingRule, value: any) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    setRulesDirty(true)
  }

  function deleteRule(id: string) {
    setRules(prev => prev.filter(r => r.id !== id))
    setRulesDirty(true)
  }

  const saveRules = useMutation({
    mutationFn: () => api.put(`/api/products/${productId}/pricing-rules`, {
      rules: rules.map(r => ({
        minQty: r.minQty,
        maxQty: r.maxQty,
        marginPercentage: r.marginPercentage,
      })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-config', productId] })
      setRulesDirty(false)
      setRuleError('')
    },
    onError: (e: any) => setRuleError(e.message),
  })

  // ── Calculator preview ─────────────────────────────────────
  const [calcQty, setCalcQty] = useState(1)
  const [calcItems, setCalcItems] = useState<{ itemId: string; qty: number }[]>([])
  const [calcResult, setCalcResult] = useState<any>(null)

  async function runCalc() {
    try {
      const result = await api.post<any>(`/api/products/${productId}/calculate-price`, {
        quantity: calcQty,
        selectedItems: calcItems,
      })
      setCalcResult(result)
    } catch (e: any) {
      setCalcResult(null)
    }
  }

  useEffect(() => {
    if (productId && config) runCalc()
  }, [calcQty, calcItems, config])

  if (isLoading) {
    return <div className="p-6 text-gray-500 dark:text-slate-400 text-sm">Cargando...</div>
  }

  const items = config?.items ?? []

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/products')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{product?.name ?? 'Producto'}</h1>
          <p className="text-xs text-gray-500 dark:text-slate-400">Configuración de ítems y precios</p>
        </div>
      </div>

      {/* ── Ítems extras ─────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-slate-700">
          <Package size={16} className="text-primary-600" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Ítems configurables (extras)</h2>
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-slate-500">
            Sin ítems aún. Agregá estampas, stickers, packaging, etc.
          </div>
        ) : (
          items.map(item => (
            <ItemRow
              key={item.id}
              item={item}
              onUpdate={(id, data) => void updateItem.mutateAsync({ itemId: id, data })}
              onDelete={(id) => void deleteItem.mutateAsync(id)}
            />
          ))
        )}

        {/* Agregar ítem */}
        <form onSubmit={handleAddItem} className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-slate-700/50">
          <input
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            placeholder="Ej: Estampa delantera"
            className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={newItemCost}
            onChange={e => setNewItemCost(Number(e.target.value))}
            className="w-24 px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg text-right bg-white dark:bg-slate-800 dark:text-slate-100"
            placeholder="Costo"
          />
          <select
            value={newItemType}
            onChange={e => setNewItemType(e.target.value as 'QUANTITY' | 'BOOLEAN')}
            className="text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="QUANTITY">Cantidad</option>
            <option value="BOOLEAN">Sí/No</option>
          </select>
          <Button type="submit" size="sm" loading={addItem.isPending} disabled={!newItemName.trim()}>
            <Plus size={14} /> Agregar
          </Button>
        </form>

        {itemError && (
          <div className="px-4 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20">{itemError}</div>
        )}
      </div>

      {/* ── Escalas de precio ────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-primary-600" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Escalas de precio</h2>
          </div>
          <button
            onClick={addRule}
            className="text-xs text-primary-600 hover:underline flex items-center gap-1"
          >
            <Plus size={13} /> Agregar escala
          </button>
        </div>

        {rules.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-slate-500">
            Sin escalas. Sin escalas se usa el precio base del producto.
          </div>
        ) : (
          rules.map(rule => (
            <PricingRuleRow
              key={rule.id}
              rule={rule}
              onChange={changeRule}
              onDelete={deleteRule}
            />
          ))
        )}

        {ruleError && (
          <div className="px-4 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20">{ruleError}</div>
        )}

        {rulesDirty && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700 flex justify-end">
            <Button
              size="sm"
              onClick={() => saveRules.mutate()}
              loading={saveRules.isPending}
            >
              Guardar escalas
            </Button>
          </div>
        )}
      </div>

      {/* ── Calculadora de precio ────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-slate-700">
          <Tag size={16} className="text-primary-600" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Calculadora de precio</h2>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 dark:text-slate-300 w-24">Cantidad</label>
            <input
              type="number"
              min="1"
              step="1"
              value={calcQty}
              onChange={e => setCalcQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24 px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          {items.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Ítems seleccionados</p>
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 dark:text-slate-300 flex-1">{item.name}</span>
                  <span className="text-xs text-gray-500 dark:text-slate-400">{formatCurrency(item.cost)}</span>
                  {item.type === 'BOOLEAN' ? (
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-primary-600"
                      onChange={e => {
                        const qty = e.target.checked ? 1 : 0
                        setCalcItems(prev => {
                          const without = prev.filter(x => x.itemId !== item.id)
                          return qty > 0 ? [...without, { itemId: item.id, qty }] : without
                        })
                      }}
                    />
                  ) : (
                    <input
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={0}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded text-center bg-white dark:bg-slate-700 dark:text-slate-100"
                      onChange={e => {
                        const qty = Math.max(0, parseInt(e.target.value) || 0)
                        setCalcItems(prev => {
                          const without = prev.filter(x => x.itemId !== item.id)
                          return qty > 0 ? [...without, { itemId: item.id, qty }] : without
                        })
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {calcResult && (
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-600 dark:text-slate-300">
                <span>Costo base</span><span>{formatCurrency(calcResult.baseCost)}</span>
              </div>
              {calcResult.extraCost > 0 && (
                <div className="flex justify-between text-sm text-gray-600 dark:text-slate-300">
                  <span>Costo extras</span><span>{formatCurrency(calcResult.extraCost)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600 dark:text-slate-300">
                <span>Costo total</span><span>{formatCurrency(calcResult.totalCost)}</span>
              </div>
              {calcResult.ruleApplied && (
                <div className="flex justify-between text-sm text-gray-500 dark:text-slate-400 text-xs">
                  <span>
                    Escala {calcResult.ruleApplied.minQty}–{calcResult.ruleApplied.maxQty ?? '∞'} un
                  </span>
                  <span>Margen {calcResult.margin}%</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 dark:text-slate-100 pt-1 border-t border-gray-200 dark:border-slate-600">
                <span>Precio unitario</span>
                <span>{formatCurrency(calcResult.unitPrice)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
