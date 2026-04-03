const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

class ApiError extends Error {
  constructor(public message: string, public status: number) {
    super(message)
  }
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('erp-auth')
    if (!stored) return null
    return JSON.parse(stored)?.state?.token ?? null
  } catch {
    return null
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken()
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  })

  if (res.status === 401) {
    // Redirigir al login si el token expiró
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new ApiError('No autorizado', 401)
  }

  const json = await res.json()

  if (!res.ok) {
    throw new ApiError(json.message ?? 'Error desconocido', res.status)
  }

  return json.data as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
