import { prisma } from '../lib/prisma'

export type AuditEntity = 'sale' | 'purchase' | 'requisition' | 'quote'

export async function writeAuditLog({
  companyId,
  entity,
  entityId,
  action,
  userId,
  userName,
  data,
}: {
  companyId: string
  entity: AuditEntity
  entityId: string
  action: string
  userId: string
  userName: string
  data?: Record<string, any>
}) {
  try {
    await prisma.auditLog.create({
      data: {
        companyId,
        entity,
        entityId,
        action,
        userId,
        userName,
        data: data ?? undefined,
      },
    })
  } catch {
    // Audit log failures should never break main flows
  }
}
