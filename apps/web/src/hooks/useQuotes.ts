import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Quote } from '@erp/shared'

export function useQuotes(params?: { status?: string }) {
  const qs = params?.status ? `?status=${params.status}` : ''
  return useQuery({
    queryKey: ['quotes', params],
    queryFn: () => api.get<Quote[]>(`/api/quotes${qs}`),
  })
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: ['quotes', id],
    queryFn: () => api.get<Quote>(`/api/quotes/${id}`),
    enabled: !!id,
  })
}

export function useCreateQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => api.post<Quote>('/api/quotes', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  })
}

export function useConvertQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, paymentMethod }: { id: string; paymentMethod: string }) =>
      api.post(`/api/quotes/${id}/convert-to-sale`, { paymentMethod }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] })
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUpdateQuoteStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/quotes/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  })
}

export function useDeleteQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/quotes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  })
}
