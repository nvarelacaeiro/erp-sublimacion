'use client'
import { useState } from 'react'
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '@/hooks/useSuppliers'
import { Truck, Search, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/shared/EmptyState'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supplierSchema, type SupplierInput } from '@erp/shared'

function SupplierForm({
  defaultValues, onSave, onCancel, loading,
}: {
  defaultValues?: any
  onSave: (d: SupplierInput) => Promise<void>
  onCancel: () => void
  loading?: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: defaultValues ?? {},
  })

  return (
    <form onSubmit={handleSubmit(onSave)} className="p-5 space-y-4">
      <Input label="Nombre *" error={errors.name?.message} {...register('name')} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Teléfono" type="tel" {...register('phone')} />
        <Input label="Email" type="email" {...register('email')} />
      </div>
      <Input label="CUIT" {...register('taxId')} />
      <Input label="Dirección" {...register('address')} />
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Notas</label>
        <textarea
          rows={2}
          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          {...register('notes')}
        />
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">Cancelar</Button>
        <Button type="submit" loading={loading} className="flex-1">Guardar</Button>
      </div>
    </form>
  )
}

export default function SuppliersPage() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)

  const { data: suppliers = [], isLoading } = useSuppliers(search || undefined)
  const create = useCreateSupplier()
  const update = useUpdateSupplier(selected?.id ?? '')
  const remove = useDeleteSupplier()

  function openCreate() { setSelected(null); setShowForm(true) }
  function openEdit(s: any) { setSelected(s); setShowForm(true) }
  function closeForm() { setShowForm(false); setSelected(null) }

  async function handleSave(data: SupplierInput) {
    if (selected) await update.mutateAsync(data)
    else await create.mutateAsync(data)
    closeForm()
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar proveedores..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <Button onClick={openCreate}>Nuevo</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl border animate-pulse" />
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Sin proveedores"
          description="Agregá tu primer proveedor."
          action={<Button onClick={openCreate}>Nuevo proveedor</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {suppliers.map((s: any) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <Truck size={16} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{s.name}</div>
                <div className="text-xs text-gray-500">
                  {[s.phone, s.email].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(s)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                  <Pencil size={15} />
                </button>
                <button
                  onClick={async () => { if (confirm('¿Eliminar proveedor?')) await remove.mutateAsync(s.id) }}
                  className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={closeForm} title={selected ? 'Editar proveedor' : 'Nuevo proveedor'}>
        <SupplierForm
          defaultValues={selected}
          onSave={handleSave}
          onCancel={closeForm}
          loading={create.isPending || update.isPending}
        />
      </Modal>
    </div>
  )
}
