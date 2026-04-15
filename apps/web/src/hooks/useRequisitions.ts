'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type RequisitionStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ORDERED' | 'CLOSED'
export type RequisitionPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

export interface RequisitionItem {
  id: string
  requisitionId: string
  productId: string | null
  description: string
  quantity: number
  unit: string
  estimatedCost: number | null
  product: { id: string; name: string; sku: string | null } | null
}

export interface Requisition {
  id: string
  number: number
  title: string
  status: RequisitionStatus
  priority: RequisitionPriority
  neededBy: string | null
  rejectionReason: string | null
  notes: string | null
  requestedBy: { id: string; name: string }
  approvedBy: { id: string; name: string } | null
  purchase?: { id: string; number: number } | null
  items: RequisitionItem[]
  createdAt: string
  updatedAt: string
}

export interface CreateRequisitionInput {
  title: string
  priority: RequisitionPriority
  neededBy?: string | null
  notes?: string | null
  items: {
    productId?: string | null
    description: string
    quantity: number
    unit: string
    estimatedCost?: number | null
  }[]
}

export function useRequisitions() {
  return useQuery({
    queryKey: ['requisitions'],
    queryFn: () => api.get<Requisition[]>('/api/requisitions'),
  })
}

export function useCreateRequisition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRequisitionInput) => api.post<Requisition>('/api/requisitions', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requisitions'] }),
  })
}

export function useUpdateRequisition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<CreateRequisitionInput>) =>
      api.put<Requisition>(`/api/requisitions/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requisitions'] }),
  })
}

export function useDeleteRequisition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/requisitions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requisitions'] }),
  })
}

export function useSubmitRequisition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/api/requisitions/${id}/submit`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requisitions'] }),
  })
}

export function useApproveRequisition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/api/requisitions/${id}/approve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requisitions'] }),
  })
}

export function useRejectRequisition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.patch(`/api/requisitions/${id}/reject`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requisitions'] }),
  })
}

export function useMarkOrdered() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, purchaseId }: { id: string; purchaseId?: string }) =>
      api.patch(`/api/requisitions/${id}/mark-ordered`, { purchaseId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requisitions'] }),
  })
}
