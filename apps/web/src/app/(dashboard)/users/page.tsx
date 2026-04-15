'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { UserRound, Pencil, Trash2, ShieldCheck, ShieldAlert, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/shared/Badge'
import { formatDate } from '@/lib/utils'

interface UserData {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'SELLER' | 'APPROVER' | 'REQUESTER'
  active: boolean
  createdAt: string
}

const ROLE_OPTIONS = [
  { value: 'SELLER', label: 'Operador' },
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'APPROVER', label: 'Aprobador' },
  { value: 'REQUESTER', label: 'Solicitante' },
]

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  SELLER: 'Operador',
  APPROVER: 'Aprobador',
  REQUESTER: 'Solicitante',
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  SELLER: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300',
  APPROVER: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  REQUESTER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

function UserForm({
  defaultValues,
  onSave,
  onCancel,
  loading,
  isEdit,
}: {
  defaultValues?: Partial<UserData>
  onSave: (data: any) => Promise<void>
  onCancel: () => void
  loading?: boolean
  isEdit?: boolean
}) {
  const [name, setName] = useState(defaultValues?.name ?? '')
  const [email, setEmail] = useState(defaultValues?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'SELLER' | 'APPROVER' | 'REQUESTER'>(defaultValues?.role ?? 'SELLER')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim() || !email.trim()) return
    if (!isEdit && !password) { setError('La contraseña es requerida'); return }
    try {
      const data: any = { name, email, role }
      if (password) data.password = password
      await onSave(data)
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-1">Nombre *</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-1">Email *</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-1">
          {isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña *'}
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder={isEdit ? 'Dejar vacío para no cambiar' : '••••••••'}
          className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-1">Rol</label>
        <select
          value={role}
          onChange={e => setRole(e.target.value as 'ADMIN' | 'SELLER' | 'APPROVER' | 'REQUESTER')}
          className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
        >
          {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">Cancelar</Button>
        <Button type="submit" loading={loading} className="flex-1">Guardar</Button>
      </div>
    </form>
  )
}

export default function UsersPage() {
  const { user: currentUser } = useAuthStore()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<UserData | null>(null)
  const [globalError, setGlobalError] = useState('')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<UserData[]>('/api/users'),
  })

  const create = useMutation({
    mutationFn: (data: any) => api.post('/api/users', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowForm(false) },
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/api/users/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowForm(false); setSelected(null) },
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (e: any) => setGlobalError(e.message),
  })

  const isAdmin = currentUser?.role === 'ADMIN'

  if (!isAdmin) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400 rounded-xl px-4 py-6 text-center">
          <ShieldAlert size={32} className="mx-auto mb-2 text-amber-600" />
          <p className="font-medium">Solo los administradores pueden gestionar usuarios.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setSelected(null); setShowForm(true) }}>
          <Plus size={16} /> Nuevo usuario
        </Button>
      </div>

      {globalError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
          {globalError}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={UserRound} title="Sin usuarios" description="Creá el primer usuario." />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                u.role === 'ADMIN' ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-gray-100 dark:bg-slate-700'
              }`}>
                {u.role === 'ADMIN'
                  ? <ShieldCheck size={16} className="text-primary-600" />
                  : <UserRound size={16} className="text-gray-500" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{u.name}</span>
                  <Badge
                    label={ROLE_LABELS[u.role] ?? u.role}
                    className={ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'}
                  />
                  {!u.active && (
                    <Badge label="Inactivo" className="bg-red-100 text-red-600" />
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400">{u.email}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => { setSelected(u); setShowForm(true) }}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400"
                >
                  <Pencil size={15} />
                </button>
                {u.id !== currentUser?.id && (
                  <button
                    onClick={async () => {
                      if (!confirm(`¿Desactivar a ${u.name}?`)) return
                      remove.mutate(u.id)
                    }}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 dark:text-slate-400 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setSelected(null) }}
        title={selected ? 'Editar usuario' : 'Nuevo usuario'}
      >
        <UserForm
          defaultValues={selected ?? undefined}
          isEdit={!!selected}
          onSave={async data => {
            if (selected) await update.mutateAsync({ id: selected.id, data })
            else await create.mutateAsync(data)
          }}
          onCancel={() => { setShowForm(false); setSelected(null) }}
          loading={create.isPending || update.isPending}
        />
      </Modal>
    </div>
  )
}
