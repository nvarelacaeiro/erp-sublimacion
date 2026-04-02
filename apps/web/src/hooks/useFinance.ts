import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useAccountsReceivable(params?: { status?: string }) {
  const qs = params?.status ? `?status=${params.status}` : ''
  return useQuery({
    queryKey: ['accounts-receivable', params],
    queryFn: () => api.get<any[]>(`/api/finance/accounts-receivable${qs}`),
  })
}

export function useAccountsPayable(params?: { status?: string }) {
  const qs = params?.status ? `?status=${params.status}` : ''
  return useQuery({
    queryKey: ['accounts-payable', params],
    queryFn: () => api.get<any[]>(`/api/finance/accounts-payable${qs}`),
  })
}

export function usePayReceivable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, amount, notes }: { id: string; amount: number; notes?: string }) =>
      api.post(`/api/finance/accounts-receivable/${id}/pay`, { amount, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts-receivable'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function usePayPayable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, amount, notes }: { id: string; amount: number; notes?: string }) =>
      api.post(`/api/finance/accounts-payable/${id}/pay`, { amount, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts-payable'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useTransactions(params?: { type?: string; from?: string; to?: string }) {
  const qs = new URLSearchParams(params as Record<string, string>)
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => api.get<any[]>(`/api/finance/transactions?${qs}`),
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post('/api/finance/transactions', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })
}
