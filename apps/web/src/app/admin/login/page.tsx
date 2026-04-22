'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setAdminKey, adminApi } from '@/lib/adminApi'

export default function AdminLoginPage() {
  const router = useRouter()
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      setAdminKey(key)
      await adminApi.getCompanies() // verifica que la clave sea válida
      router.push('/admin/companies')
    } catch (err: any) {
      setAdminKey('')
      setError('Clave incorrecta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
            <path d="M 7 0.5 L 13.5 9 L 7 17.5 L 0.5 9 Z" fill="#4f46e5"/>
          </svg>
          <span className="text-xl font-bold text-slate-100 tracking-tight">norde</span>
          <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded ml-1">admin</span>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Clave de acceso</label>
            <input
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="••••••••••••"
              autoFocus
              className="w-full px-3 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={!key || loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-600 mt-4">
          Clave: norde-admin-2024
        </p>
      </div>
    </div>
  )
}
