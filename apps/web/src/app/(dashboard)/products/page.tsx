'use client'
import { useState } from 'react'
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts'
import { api } from '@/lib/api'
import { Package, Search, AlertTriangle, Pencil, Trash2, Settings2, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/shared/EmptyState'
import { ProductForm, type ProductFormExtras } from '@/components/products/ProductForm'
import type { Product } from '@erp/shared'

export default function ProductsPage() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { data: products = [], isLoading } = useProducts({ search: search || undefined })

  const lowStockProducts = products.filter(p => p.stock <= p.minStock && p.minStock > 0)

  function sendStockAlert() {
    const lines = lowStockProducts.map(
      p => `• *${p.name}*: stock actual ${p.stock} ${p.unit} (mínimo ${p.minStock} ${p.unit})`,
    ).join('\n')
    const text = encodeURIComponent(`🚨 *Alerta de stock bajo*\n\n${lines}\n\n_Por favor reponer lo antes posible._`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct(selected?.id ?? '')
  const deleteProduct = useDeleteProduct()

  function openCreate() { setSelected(null); setShowForm(true) }
  function openEdit(p: Product) { setSelected(p); setShowForm(true) }
  function closeForm() { setShowForm(false); setSelected(null) }

  async function handleSave(data: any, extras: ProductFormExtras) {
    if (selected) {
      await updateProduct.mutateAsync(data)
      const productId = selected.id
      // Delete removed items
      for (const item of extras.items.filter(i => i.toDelete && i.id)) {
        await api.delete(`/api/products/${productId}/items/${item.id}`)
      }
      // Add new items
      for (const item of extras.items.filter(i => !i.id && !i.toDelete)) {
        await api.post(`/api/products/${productId}/items`, {
          name: item.name, cost: item.cost, type: item.type,
        })
      }
      // Replace all pricing rules
      await api.put(`/api/products/${productId}/pricing-rules`, { rules: extras.rules })
    } else {
      const product = await createProduct.mutateAsync(data) as any
      const productId = product.id
      for (const item of extras.items.filter(i => !i.toDelete)) {
        await api.post(`/api/products/${productId}/items`, {
          name: item.name, cost: item.cost, type: item.type,
        })
      }
      if (extras.rules.length > 0) {
        await api.put(`/api/products/${productId}/pricing-rules`, { rules: extras.rules })
      }
    }
    closeForm()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar producto?')) return
    await deleteProduct.mutateAsync(id)
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Search + action */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar productos..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        {lowStockProducts.length > 0 && (
          <button
            onClick={sendStockAlert}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
            title="Enviar alerta de stock bajo por WhatsApp"
          >
            <AlertTriangle size={14} />
            <span className="hidden sm:inline">{lowStockProducts.length} stock bajo</span>
            <MessageCircle size={14} />
          </button>
        )}
        <Button onClick={openCreate}>Nuevo</Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl border border-gray-200 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Sin productos"
          description="Creá tu primer producto para empezar."
          action={<Button onClick={openCreate}>Nuevo producto</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {products.map(product => (
            <div key={product.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">{product.name}</span>
                  {product.stock <= product.minStock && (
                    <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                  )}
                </div>
                <div className="text-xs text-gray-500 flex gap-3 mt-0.5">
                  <span>Stock: <strong>{product.stock} {product.unit}</strong></span>
                  {product.sku && <span className="hidden sm:inline">SKU: {product.sku}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Link
                  href={`/products/${product.id}`}
                  className="p-2 rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-600"
                  title="Vista avanzada"
                >
                  <Settings2 size={15} />
                </Link>
                <button
                  onClick={() => openEdit(product)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={closeForm}
        title={selected ? 'Editar producto' : 'Nuevo producto'}
        size="lg"
      >
        <ProductForm
          defaultValues={selected ? { ...selected, id: selected.id } : undefined}
          onSave={handleSave}
          onCancel={closeForm}
          loading={createProduct.isPending || updateProduct.isPending}
        />
      </Modal>
    </div>
  )
}
