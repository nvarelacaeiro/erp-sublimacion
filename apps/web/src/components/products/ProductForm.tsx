'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type ProductInput } from '@erp/shared'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface ProductFormProps {
  defaultValues?: Partial<ProductInput>
  onSave: (data: ProductInput) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function ProductForm({ defaultValues, onSave, onCancel, loading }: ProductFormProps) {
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<any[]>('/api/categories'),
  })

  const { register, handleSubmit, formState: { errors } } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      cost: 0,
      price: 0,
      stock: 0,
      minStock: 0,
      unit: 'un',
      ...defaultValues,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSave)} className="p-5 space-y-4">
      <Input
        label="Nombre *"
        placeholder="Ej: Remera Sublimable Blanca"
        error={errors.name?.message}
        {...register('name')}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="SKU"
          placeholder="Ej: CAM-001"
          {...register('sku')}
        />
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

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Costo ($) *"
          type="number"
          step="0.01"
          min="0"
          error={errors.cost?.message}
          {...register('cost', { valueAsNumber: true })}
        />
        <Input
          label="Precio venta ($) *"
          type="number"
          step="0.01"
          min="0"
          error={errors.price?.message}
          {...register('price', { valueAsNumber: true })}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Stock actual"
          type="number"
          step="0.001"
          min="0"
          {...register('stock', { valueAsNumber: true })}
        />
        <Input
          label="Stock mínimo"
          type="number"
          step="0.001"
          min="0"
          hint="Alerta de stock bajo"
          {...register('minStock', { valueAsNumber: true })}
        />
        <Input
          label="Unidad"
          placeholder="un, kg, m..."
          {...register('unit')}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" loading={loading} className="flex-1">
          Guardar
        </Button>
      </div>
    </form>
  )
}
