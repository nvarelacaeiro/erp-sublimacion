import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function usePurchases(params?: { from?: string; to?: string }) {
  const qs = new URLSearchParams(params as Record<string, string>)
  return useQuery({
    queryKey: ['purchases', params],
    queryFn: () => api.get<any[]>(`/api/purchases?${qs}`),
  })
}

export function useCreatePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post('/api/purchases', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
