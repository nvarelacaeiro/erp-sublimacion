import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Product } from '@erp/shared'

export function useProducts(params?: { search?: string; lowStock?: boolean }) {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.lowStock) qs.set('lowStock', 'true')

  return useQuery({
    queryKey: ['products', params],
    queryFn: () => api.get<Product[]>(`/api/products?${qs}`),
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => api.get<Product>(`/api/products/${id}`),
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Product>) => api.post<Product>('/api/products', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Product>) => api.put<Product>(`/api/products/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useAdjustStock(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { quantity: number; notes: string }) =>
      api.post(`/api/products/${id}/adjust`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}
