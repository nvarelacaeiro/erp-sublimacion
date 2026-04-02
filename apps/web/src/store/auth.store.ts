import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@erp/shared'

interface AuthState {
  user: AuthUser | null
  token: string | null
  setAuth: (user: AuthUser, token: string) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null }),
      isAuthenticated: () => !!get().user,
    }),
    { name: 'erp-auth' },
  ),
)
