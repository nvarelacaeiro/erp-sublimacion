'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/useClients'
import { formatCurrency } from '@/lib/utils'
import { Users, Search, Pencil, Trash2, Phone, Mail, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/shared/EmptyState'
import { ImportModal } from '@/components/shared/ImportModal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { clientSchema, type ClientInput } from '@erp/shared'
import type { Client } from '@erp/shared'

function ClientForm({
  defaultValues,
  onSave,
  onCancel,
  loading,
}: {
  defaultValues?: Partial<Client>
  onSave: (d: ClientInput) => Promise<void>
  onCancel: () => void
  loading?: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: defaultValues ?? {},
  })

  return (
    <form onSubmit={handleSubmit(onSave)} className="p-5 space-y-4">
      <Input label="Nombre *" error={errors.name?.message} {...register('name')} />
      <Input label="Razón social" {...register('businessName')} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Teléfono" type="tel" {...register('phone')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
      </div>
      <Input label="CUIT / DNI" {...register('taxId')} />
      <Input label="Dirección" {...register('address')} />
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-1">Notas</label>
        <textarea
          rows={2}
          className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none bg-white dark:bg-slate-800 dark:text-slate-100"
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

export default function ClientsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Client | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const { data: clients = [], isLoading } = useClients(search || undefined)
  const createClient = useCreateClient()
  const updateClient = useUpdateClient(selected?.id ?? '')
  const deleteClient = useDeleteClient()

  function openCreate() { setSelected(null); setShowForm(true) }
  function openEdit(c: Client) { setSelected(c); setShowForm(true) }
  function closeForm() { setShowForm(false); setSelected(null) }

  async function handleSave(data: ClientInput) {
    if (selected) await updateClient.mutateAsync(data)
    else await createClient.mutateAsync(data)
    closeForm()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar cliente?')) return
    await deleteClient.mutateAsync(id)
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar clientes..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>
        <Button variant="secondary" onClick={() => setShowImport(true)} className="flex items-center gap-1.5">
          <Upload size={15} />
          <span className="hidden sm:inline">Importar</span>
        </Button>
        <Button onClick={openCreate}>Nuevo</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 animate-pulse" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin clientes"
          description="Agregá tu primer cliente."
          action={<Button onClick={openCreate}>Nuevo cliente</Button>}
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
          {clients.map(client => (
            <div key={client.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                <span className="text-primary-700 dark:text-primary-400 text-sm font-semibold">
                  {client.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{client.name}</div>
                <div className="text-xs text-gray-500 dark:text-slate-400 flex gap-3">
                  {client.phone && <span>{client.phone}</span>}
                  {client.totalDebt > 0 && (
                    <span className="text-amber-600 font-medium">
                      Debe: {formatCurrency(client.totalDebt)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {client.phone && (
                  <a
                    href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-400 dark:text-slate-500 hover:text-green-600"
                    title="WhatsApp"
                  >
                    <Phone size={15} />
                  </a>
                )}
                {client.email && (
                  <a
                    href={`mailto:${client.email}`}
                    className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 dark:text-slate-500 hover:text-blue-600"
                    title="Email"
                  >
                    <Mail size={15} />
                  </a>
                )}
                <button onClick={() => openEdit(client)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400">
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(client.id)}
                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 dark:text-slate-400 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={closeForm} title={selected ? 'Editar cliente' : 'Nuevo cliente'}>
        <ClientForm
          defaultValues={selected ?? undefined}
          onSave={handleSave}
          onCancel={closeForm}
          loading={createClient.isPending || updateClient.isPending}
        />
      </Modal>

      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        entity="clients"
        onSuccess={() => { qc.invalidateQueries({ queryKey: ['clients'] }); setShowImport(false) }}
      />
    </div>
  )
}
