import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Sale } from '@erp/shared'

export function useSales(params?: { from?: string; to?: string }) {
  const qs = new URLSearchParams(params as Record<string, string>)
  return useQuery({
    queryKey: ['sales', params],
    queryFn: () => api.get<Sale[]>(`/api/sales?${qs}`),
  })
}

export function useCreateSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => api.post<Sale>('/api/sales', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useCancelSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/api/sales/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales'] }),
  })
}

export function useDashboard(params?: { range?: string; from?: string; to?: string }) {
  const qs = new URLSearchParams()
  if (params?.range) qs.set('range', params.range)
  if (params?.from) qs.set('from', params.from)
  if (params?.to) qs.set('to', params.to)

  return useQuery({
    queryKey: ['dashboard', params],
    queryFn: () => api.get<any>(`/api/dashboard?${qs}`),
    refetchInterval: 5 * 60 * 1000,
  })
}
