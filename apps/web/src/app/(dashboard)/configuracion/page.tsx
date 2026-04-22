'use client'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'
import { Save, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const PROJECT_LABEL_SUGGESTIONS = ['Obra', 'Proyecto', 'Cliente', 'Campaña', 'Evento', 'Pedido', 'Trabajo']

export default function ConfiguracionPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  const [projectLabel, setProjectLabel] = useState('Obra')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<any>('/api/settings').then(s => {
      if (s.projectLabel) setProjectLabel(s.projectLabel)
    }).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await api.put('/api/settings', { projectLabel })
      setSuccess('Configuración guardada.')
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto">
        <p className="text-sm text-gray-500 dark:text-slate-400">Solo los administradores pueden acceder a la configuración.</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Settings size={18} className="text-gray-400" />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Configuración de la empresa</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Solicitudes de compra</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
              Nombre del campo "Obra"
            </label>
            <input
              value={projectLabel}
              onChange={e => setProjectLabel(e.target.value)}
              required
              maxLength={40}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 dark:text-slate-100"
            />
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1.5">
              ¿Cómo llamás a los proyectos en tu empresa?
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PROJECT_LABEL_SUGGESTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setProjectLabel(s)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    projectLabel === s
                      ? 'bg-primary-100 dark:bg-primary-600/20 border-primary-300 dark:border-primary-500 text-primary-700 dark:text-primary-400'
                      : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-500'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error   && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
        {success && <p className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">{success}</p>}

        <Button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2">
          <Save size={15} />
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </Button>
      </form>
    </div>
  )
}
