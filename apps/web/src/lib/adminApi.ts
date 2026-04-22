const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function getAdminKey(): string {
  if (typeof window === 'undefined') return ''
  return sessionStorage.getItem('norde_admin_key') ?? ''
}

export function setAdminKey(key: string) {
  sessionStorage.setItem('norde_admin_key', key)
}

export function clearAdminKey() {
  sessionStorage.removeItem('norde_admin_key')
}

export function hasAdminKey(): boolean {
  return !!getAdminKey()
}

async function adminFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': getAdminKey(),
      ...(options?.headers ?? {}),
    },
  })

  if (res.status === 401) throw new Error('UNAUTHORIZED')

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }

  return res.json()
}

export const adminApi = {
  getCompanies: () =>
    adminFetch('/api/admin/companies'),

  getCompany: (id: string) =>
    adminFetch(`/api/admin/companies/${id}`),

  createCompany: (data: {
    name: string
    slug: string
    plan: 'TRIAL' | 'STARTER' | 'PRO'
    trialDays: number
    adminName: string
    adminEmail: string
    adminPassword: string
  }) =>
    adminFetch('/api/admin/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCompany: (id: string, data: {
    name?: string
    slug?: string
    plan?: 'TRIAL' | 'STARTER' | 'PRO'
    active?: boolean
    trialEndsAt?: string | null
  }) =>
    adminFetch(`/api/admin/companies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  suspendCompany: (id: string) =>
    adminFetch(`/api/admin/companies/${id}/suspend`, { method: 'POST' }),

  unsuspendCompany: (id: string) =>
    adminFetch(`/api/admin/companies/${id}/unsuspend`, { method: 'POST' }),

  addUser: (companyId: string, data: {
    name: string
    email: string
    password: string
    role: 'ADMIN' | 'SELLER' | 'APPROVER' | 'REQUESTER'
  }) =>
    adminFetch(`/api/admin/companies/${companyId}/users`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}
