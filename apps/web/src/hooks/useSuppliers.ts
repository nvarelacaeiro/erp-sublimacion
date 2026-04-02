import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useSuppliers(search?: string) {
  const qs = search ? `?search=${search}` : ''
  return useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => api.get<any[]>(`/api/suppliers${qs}`),
  })
}

export function useCreateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post('/api/suppliers', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

export function useUpdateSupplier(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.put(`/api/suppliers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

export function useDeleteSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/suppliers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}
