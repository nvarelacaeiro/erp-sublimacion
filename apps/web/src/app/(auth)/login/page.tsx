'use client'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { SiTiendaLogo } from '@/components/layout/SiTiendaLogo'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err: any) {
      setError(err.message ?? 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#E8EEF5] dark:bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-8">
          <SiTiendaLogo className="h-10 w-auto" />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-8">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-6">Iniciar sesión</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" type="email" placeholder="admin@demo.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            <Input label="Contraseña" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
              Ingresar
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-slate-500 mt-6">
          Demo: admin@demo.com / admin123
        </p>
      </div>
    </div>
  )
}
