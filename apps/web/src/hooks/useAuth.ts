'use client'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import type { LoginResponse } from '@erp/shared'

export function useAuth() {
  const router = useRouter()
  const { user, setAuth, clearAuth, isAuthenticated } = useAuthStore()

  async function login(email: string, password: string) {
    const data = await api.post<LoginResponse>('/api/auth/login', { email, password })
    setAuth(data.user, data.accessToken)
    router.push('/')
  }

  async function logout() {
    try {
      await api.post('/api/auth/logout')
    } catch {
      // Ignorar errores del servidor — limpiar sesión local igual
    }
    clearAuth()
    router.push('/login')
  }

  return { user, login, logout, isAuthenticated }
}
