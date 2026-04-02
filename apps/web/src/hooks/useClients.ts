import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Client } from '@erp/shared'

export function useClients(search?: string) {
  const qs = search ? `?search=${search}` : ''
  return useQuery({
    queryKey: ['clients', search],
    queryFn: () => api.get<Client[]>(`/api/clients${qs}`),
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Client>) => api.post<Client>('/api/clients', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
}

export function useUpdateClient(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Client>) => api.put<Client>(`/api/clients/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/clients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
}
