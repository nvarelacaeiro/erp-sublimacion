'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface DeliveryNote {
  id: string
  number: number
  saleId: string
  date: string
  notes: string | null
  createdAt: string
  sale: {
    id: string
    number: number
    client: { id: string; name: string } | null
    total: number
    items: {
      id: string
      description: string
      quantity: number
      unitPrice: number
      total: number
      product: { id: string; name: string; sku: string | null } | null
    }[]
  }
}

export function useDeliveryNotes(params?: { saleId?: string; from?: string; to?: string }) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v)) as Record<string, string>,
  )
  return useQuery({
    queryKey: ['delivery-notes', params],
    queryFn: () => api.get<DeliveryNote[]>(`/api/delivery-notes?${qs}`),
  })
}

export function useCreateDeliveryNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { saleId: string; notes?: string | null }) =>
      api.post<DeliveryNote>('/api/delivery-notes', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-notes'] }),
  })
}

export function useDeleteDeliveryNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/delivery-notes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-notes'] }),
  })
}
