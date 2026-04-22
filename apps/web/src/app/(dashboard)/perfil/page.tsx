'use client'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { Save, Phone } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function PerfilPage() {
  const { user, setUser } = useAuthStore()
  const qc = useQueryClient()

  const [name, setName]         = useState(user?.name ?? '')
  const [phone, setPhone]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [success, setSuccess]   = useState('')
  const [error, setError]       = useState('')

  // Cargar phone actual desde /me
  useEffect(() => {
    api.get<any>('/api/auth/me').then(u => {
      setName(u.name)
      setPhone(u.phone ?? '')
    }).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password && password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password && password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setSaving(true)
    try {
      const body: any = { name, phone: phone || null }
      if (password) body.password = password

      const updated = await api.put<any>('/api/auth/profile', body)
      setUser({ ...user!, name: updated.name })
      setPassword('')
      setConfirm('')
      setSuccess('Perfil actualizado correctamente.')
      qc.invalidateQueries({ queryKey: ['me'] })
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">Mi perfil</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Datos personales */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Datos personales</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Nombre</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Phone size={14} />
                WhatsApp (con código de país)
              </span>
            </label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Ej: 5493513000000"
              type="tel"
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 dark:text-slate-100 placeholder-gray-400"
            />
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              Sin + ni espacios. Ej Argentina Córdoba: 5493513XXXXXXX
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-500 dark:text-slate-400 mb-1">Email</label>
            <p className="text-sm text-gray-700 dark:text-slate-300 font-medium">{user?.email}</p>
          </div>
        </div>

        {/* Cambiar contraseña */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Cambiar contraseña</h2>
          <p className="text-xs text-gray-400 dark:text-slate-500">Dejá en blanco si no querés cambiarla.</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="mínimo 6 caracteres"
                className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 dark:text-slate-100 placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Confirmar</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="repetí la contraseña"
                className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 dark:text-slate-100 placeholder-gray-400"
              />
            </div>
          </div>
        </div>

        {error   && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
        {success && <p className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">{success}</p>}

        <Button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2">
          <Save size={15} />
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </form>
    </div>
  )
}
