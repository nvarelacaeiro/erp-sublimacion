'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminApi } from '@/lib/adminApi'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function NewCompanyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    slug: '',
    plan: 'TRIAL' as 'TRIAL' | 'STARTER' | 'PRO',
    trialDays: 14,
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  })

  function set(field: string, value: any) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleNameChange(value: string) {
    setForm(f => ({ ...f, name: value, slug: slugify(value) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await adminApi.createCompany(form)
      router.push('/admin/companies')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/companies" className="text-slate-500 hover:text-slate-300 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-lg font-semibold text-slate-100">Nueva empresa</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Empresa */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Datos de la empresa</h2>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Nombre *</label>
            <input
              value={form.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Ej: Textiles del Norte"
              required
              className="w-full px-3 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Slug (subdominio) *</label>
            <div className="flex items-center gap-0">
              <input
                value={form.slug}
                onChange={e => set('slug', slugify(e.target.value))}
                placeholder="textiles-del-norte"
                required
                pattern="^[a-z0-9-]+$"
                className="flex-1 px-3 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-l-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <span className="px-3 py-2.5 text-sm bg-slate-700 border border-l-0 border-slate-700 rounded-r-lg text-slate-400 whitespace-nowrap">
                .norde.ar
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Plan</label>
              <select
                value={form.plan}
                onChange={e => set('plan', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TRIAL">Trial</option>
                <option value="STARTER">Starter</option>
                <option value="PRO">Pro</option>
              </select>
            </div>
            {form.plan === 'TRIAL' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Días de trial</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={form.trialDays}
                  onChange={e => set('trialDays', Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Usuario admin */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Primer usuario (admin)</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Nombre *</label>
              <input
                value={form.adminName}
                onChange={e => set('adminName', e.target.value)}
                placeholder="Juan Pérez"
                required
                className="w-full px-3 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Email *</label>
              <input
                type="email"
                value={form.adminEmail}
                onChange={e => set('adminEmail', e.target.value)}
                placeholder="juan@empresa.com"
                required
                className="w-full px-3 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Contraseña inicial *</label>
            <input
              type="password"
              value={form.adminPassword}
              onChange={e => set('adminPassword', e.target.value)}
              placeholder="mínimo 6 caracteres"
              required
              minLength={6}
              className="w-full px-3 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="flex gap-3">
          <Link
            href="/admin/companies"
            className="flex-1 py-2.5 text-center text-sm text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Creando...' : 'Crear empresa'}
          </button>
        </div>
      </form>
    </div>
  )
}
