'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface AuditLogEntry {
  id: string
  entity: string
  entityId: string
  action: string
  userId: string
  userName: string
  data: Record<string, any> | null
  createdAt: string
}

const ACTION_LABELS: Record<string, string> = {
  created: 'Creado',
  updated: 'Actualizado',
  cancelled: 'Cancelado',
  submitted: 'Enviado para aprobación',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  ordered: 'Convertido a compra',
  paid: 'Marcado como pagado',
  deleted: 'Eliminado',
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

export function useAuditLog(entity: string, entityId: string | null | undefined) {
  return useQuery({
    queryKey: ['audit', entity, entityId],
    queryFn: () => api.get<AuditLogEntry[]>(`/api/audit?entity=${entity}&entityId=${entityId}`),
    enabled: !!entityId,
  })
}
