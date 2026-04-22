'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { adminApi } from '@/lib/adminApi'
import { ArrowLeft, UserPlus, CheckCircle, XCircle, Users } from 'lucide-react'
import Link from 'next/link'

const PLAN_COLOR: Record<string, string> = {
  TRIAL:   'bg-amber-400/10 text-amber-400 border-amber-400/20',
  STARTER: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  PRO:     'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin', SELLER: 'Vendedor', APPROVER: 'Aprobador', REQUESTER: 'Solicitante',
}

export default function CompanyDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'SELLER' })
  const [userError, setUserError] = useState('')

  function load() {
    adminApi.getCompany(id)
      .then(res => setCompany(res.data))
      .catch(err => {
        if (err.message === 'UNAUTHORIZED') router.replace('/admin/login')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  async function toggleActive() {
    setSaving(true)
    try {
      const updated = await adminApi.updateCompany(id, { active: !company.active })
      setCompany(updated.data)
    } finally {
      setSaving(false)
    }
  }

  async function toggleSuspended() {
    setSaving(true)
    try {
      const fn = company.suspended ? adminApi.unsuspendCompany : adminApi.suspendCompany
      await fn(id)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function changePlan(plan: string) {
    setSaving(true)
    try {
      const updated = await adminApi.updateCompany(id, { plan: plan as any })
      setCompany(updated.data)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    setUserError('')
    try {
      await adminApi.addUser(id, newUser as any)
      setShowAddUser(false)
      setNewUser({ name: '', email: '', password: '', role: 'SELLER' })
      load()
    } catch (err: any) {
      setUserError(err.message)
    }
  }

  if (loading) return (
    <div className="max-w-3xl space-y-3">
      {[1, 2].map(i => <div key={i} className="h-32 bg-slate-900 rounded-xl border border-slate-800 animate-pulse" />)}
    </div>
  )

  if (!company) return <p className="text-slate-500 text-sm">Empresa no encontrada.</p>

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/companies" className="text-slate-500 hover:text-slate-300 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold text-slate-100">{company.name}</h1>
            {company.slug && <span className="text-xs text-slate-500 font-mono">{company.slug}.norde.ar</span>}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${PLAN_COLOR[company.plan]}`}>
              {company.plan}
            </span>
            {company.active
              ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle size={11} /> Activa</span>
              : <span className="flex items-center gap-1 text-xs text-slate-500"><XCircle size={11} /> Inactiva</span>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Creada el {new Date(company.createdAt).toLocaleDateString('es-AR')}
            {company.trialEndsAt && ` · Trial hasta ${new Date(company.trialEndsAt).toLocaleDateString('es-AR')}`}
          </p>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Configuración</h2>
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Plan</label>
            <select
              value={company.plan}
              onChange={e => changePlan(e.target.value)}
              disabled={saving}
              className="px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="TRIAL">Trial</option>
              <option value="STARTER">Starter</option>
              <option value="PRO">Pro</option>
            </select>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <button
              onClick={toggleSuspended}
              disabled={saving}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors disabled:opacity-50 ${
                company.suspended
                  ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-400/10'
                  : 'border-amber-500/30 text-amber-400 hover:bg-amber-400/10'
              }`}
            >
              {company.suspended ? 'Reactivar cuenta' : 'Suspender cuenta'}
            </button>
            <button
              onClick={toggleActive}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg border border-red-500/30 text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
            >
              {company.active ? 'Desactivar empresa' : 'Activar empresa'}
            </button>
          </div>
        </div>
      </div>

      {/* Uso vs límites del plan */}
      {company.usage && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Uso del plan</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Usuarios', key: 'users' },
              { label: 'Productos', key: 'products' },
            ].map(({ label, key }) => {
              const { current, max } = company.usage[key]
              const pct = max === -1 ? 0 : Math.min((current / max) * 100, 100)
              const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>{label}</span>
                    <span className="font-mono">{current} / {max === -1 ? '∞' : max}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: max === -1 ? '10%' : `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Productos',     value: company._count.products },
          { label: 'Clientes',      value: company._count.clients },
          { label: 'Ventas',        value: company._count.sales },
          { label: 'Compras',       value: company._count.purchases },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-slate-100">{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Usuarios */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-slate-400" />
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Usuarios</h2>
          </div>
          <button
            onClick={() => setShowAddUser(!showAddUser)}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <UserPlus size={13} />
            Agregar usuario
          </button>
        </div>

        {/* Formulario nuevo usuario */}
        {showAddUser && (
          <form onSubmit={handleAddUser} className="bg-slate-800 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                value={newUser.name}
                onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))}
                placeholder="Nombre"
                required
                className="px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                value={newUser.email}
                onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))}
                placeholder="Email"
                required
                className="px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                value={newUser.password}
                onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                placeholder="Contraseña (mín. 6)"
                required
                minLength={6}
                className="px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newUser.role}
                onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}
                className="px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ADMIN">Admin</option>
                <option value="SELLER">Vendedor</option>
                <option value="APPROVER">Aprobador</option>
                <option value="REQUESTER">Solicitante</option>
              </select>
            </div>
            {userError && <p className="text-xs text-red-400">{userError}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowAddUser(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200">
                Cancelar
              </button>
              <button type="submit" className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg">
                Agregar
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-slate-800">
          {company.users.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm text-slate-200">{u.name}</div>
                <div className="text-xs text-slate-500">{u.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                  {ROLE_LABEL[u.role]}
                </span>
                {!u.active && <span className="text-xs text-slate-600">Inactivo</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
