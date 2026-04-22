import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { handleError, NotFoundError, AppError } from '../lib/errors'
import { writeAuditLog } from '../services/audit.service'
import { sendRequisitionSubmittedEmail } from '../services/email.service'

const itemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().default('un'),
  estimatedCost: z.number().nonnegative().optional().nullable(),
})

const createSchema = z.object({
  title: z.string().min(1).max(100),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  neededBy: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1),
})

const updateSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  neededBy: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1).optional(),
})

async function getNextRequisitionNumber(companyId: string): Promise<number> {
  const max = await prisma.requisition.aggregate({
    where: { companyId },
    _max: { number: true },
  })
  return (max._max.number ?? 0) + 1
}

export async function requisitionRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // ── LIST ─────────────────────────────────────────────────────
  app.get('/', authenticate, async (request, reply) => {
    try {
      const { companyId, id: userId, role } = request.user as any

      // REQUESTER sees only their own; ADMIN/APPROVER see all
      const where: any = { companyId }
      if (role === 'REQUESTER') where.requestedById = userId

      const requisitions = await prisma.requisition.findMany({
        where,
        include: {
          requestedBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true, phone: true } },
          project: { select: { id: true, name: true } },
          purchase: { select: { id: true, number: true } },
          items: {
            include: { product: { select: { id: true, name: true, sku: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      const mapped = requisitions.map(r => ({
        ...r,
        items: r.items.map(item => ({
          ...item,
          quantity: Number(item.quantity),
          estimatedCost: item.estimatedCost ? Number(item.estimatedCost) : null,
        })),
      }))

      return reply.send({ data: mapped })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // ── GET ONE ──────────────────────────────────────────────────
  app.get('/:id', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any

      const r = await prisma.requisition.findFirst({
        where: { id, companyId },
        include: {
          requestedBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true, phone: true } },
          project: { select: { id: true, name: true } },
          purchase: { select: { id: true, number: true } },
          items: {
            include: { product: { select: { id: true, name: true, sku: true } } },
          },
        },
      })
      if (!r) throw new NotFoundError('Solicitud')

      return reply.send({
        data: {
          ...r,
          items: r.items.map(item => ({
            ...item,
            quantity: Number(item.quantity),
            estimatedCost: item.estimatedCost ? Number(item.estimatedCost) : null,
          })),
        },
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // ── CREATE ───────────────────────────────────────────────────
  app.post('/', authenticate, async (request, reply) => {
    try {
      const { companyId, id: userId } = request.user as any
      const body = createSchema.parse(request.body)

      const number = await getNextRequisitionNumber(companyId)

      const requisition = await prisma.requisition.create({
        data: {
          companyId,
          requestedById: userId,
          number,
          title: body.title,
          priority: body.priority,
          neededBy: body.neededBy ? new Date(body.neededBy) : null,
          notes: body.notes,
          projectId: body.projectId ?? null,
          status: 'DRAFT',
          items: {
            create: body.items.map(item => ({
              productId: item.productId ?? null,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              estimatedCost: item.estimatedCost ?? null,
            })),
          },
        },
        include: {
          requestedBy: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
      })

      return reply.code(201).send({
        data: {
          ...requisition,
          items: requisition.items.map(item => ({
            ...item,
            quantity: Number(item.quantity),
            estimatedCost: item.estimatedCost ? Number(item.estimatedCost) : null,
          })),
        },
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // ── UPDATE (DRAFT por solicitante; PENDING por aprobador) ───
  app.put('/:id', authenticate, async (request, reply) => {
    try {
      const { companyId, id: userId, role } = request.user as any
      const { id } = request.params as any
      const body = updateSchema.parse(request.body)

      const existing = await prisma.requisition.findFirst({ where: { id, companyId } })
      if (!existing) throw new NotFoundError('Solicitud')

      const isApprover = role === 'ADMIN' || role === 'APPROVER'

      if (existing.status === 'DRAFT') {
        if (role === 'REQUESTER' && existing.requestedById !== userId) {
          throw new AppError('No tenés permiso para editar esta solicitud', 403)
        }
      } else if (existing.status === 'PENDING') {
        if (!isApprover) throw new AppError('Solo el aprobador puede editar solicitudes pendientes', 403)
      } else {
        throw new AppError('No se puede editar una solicitud en este estado', 400)
      }

      const requisition = await prisma.requisition.update({
        where: { id },
        data: {
          title: body.title,
          priority: body.priority,
          neededBy: body.neededBy !== undefined ? (body.neededBy ? new Date(body.neededBy) : null) : undefined,
          notes: body.notes,
          projectId: body.projectId !== undefined ? (body.projectId ?? null) : undefined,
          ...(body.items && {
            items: {
              deleteMany: {},
              create: body.items.map(item => ({
                productId: item.productId ?? null,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                estimatedCost: item.estimatedCost ?? null,
              })),
            },
          }),
        },
        include: {
          requestedBy: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
      })

      // Audit log cuando aprobador edita en PENDING
      if (existing.status === 'PENDING' && isApprover) {
        await writeAuditLog({
          companyId,
          entity: 'requisition',
          entityId: id,
          action: 'edited_by_approver',
          userId,
          userName: requisition.requestedBy.name,
          data: { title: body.title, notes: body.notes },
        })
      }

      return reply.send({
        data: {
          ...requisition,
          items: requisition.items.map(item => ({
            ...item,
            quantity: Number(item.quantity),
            estimatedCost: item.estimatedCost ? Number(item.estimatedCost) : null,
          })),
        },
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // ── DELETE (only DRAFT) ───────────────────────────────────────
  app.delete('/:id', authenticate, async (request, reply) => {
    try {
      const { companyId, id: userId, role } = request.user as any
      const { id } = request.params as any

      const existing = await prisma.requisition.findFirst({ where: { id, companyId } })
      if (!existing) throw new NotFoundError('Solicitud')
      if (existing.status !== 'DRAFT') throw new AppError('Solo se pueden eliminar solicitudes en borrador', 400)
      if (role === 'REQUESTER' && existing.requestedById !== userId) {
        throw new AppError('No tenés permiso para eliminar esta solicitud', 403)
      }

      await prisma.requisition.delete({ where: { id } })
      return reply.send({ data: { message: 'Solicitud eliminada' } })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // ── SUBMIT (DRAFT → PENDING) ──────────────────────────────────
  app.patch('/:id/submit', authenticate, async (request, reply) => {
    try {
      const { companyId, id: userId, role } = request.user as any
      const { id } = request.params as any

      const existing = await prisma.requisition.findFirst({ where: { id, companyId } })
      if (!existing) throw new NotFoundError('Solicitud')
      if (existing.status !== 'DRAFT') throw new AppError('La solicitud ya fue enviada', 400)
      if (role === 'REQUESTER' && existing.requestedById !== userId) {
        throw new AppError('No tenés permiso para enviar esta solicitud', 403)
      }

      const r = await prisma.requisition.update({
        where: { id },
        data: { status: 'PENDING' },
        include: { requestedBy: { select: { id: true, name: true } } },
      })
      await writeAuditLog({ companyId, entity: 'requisition', entityId: id, action: 'submitted', userId, userName: r.requestedBy.name, data: { number: existing.number, title: existing.title } })

      // Notificar por email a ADMINs y APPROVERs de la empresa (fire-and-forget)
      prisma.user.findMany({
        where: { companyId, role: { in: ['ADMIN', 'APPROVER'] } },
        select: { email: true },
      }).then(approvers => {
        const emails = approvers.map(u => u.email).filter(Boolean)
        console.log('[email] destinatarios:', emails)
        return sendRequisitionSubmittedEmail({
          to: emails,
          requisitionNumber: existing.number,
          requisitionTitle: existing.title,
          requesterName: r.requestedBy.name,
          appUrl: process.env.APP_URL ?? 'https://erp-sublimacion.vercel.app',
        })
      }).then(() => {
        console.log('[email] enviado OK')
      }).catch((err: any) => {
        console.error('[email] error al enviar:', err?.message ?? err)
      })

      return reply.send({ data: r })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // ── APPROVE (PENDING → APPROVED) ─────────────────────────────
  app.patch('/:id/approve', authenticate, async (request, reply) => {
    try {
      const { companyId, id: userId, name: userName, role } = request.user as any
      const { id } = request.params as any

      if (role !== 'ADMIN' && role !== 'APPROVER') {
        throw new AppError('No tenés permiso para aprobar solicitudes', 403)
      }

      const existing = await prisma.requisition.findFirst({ where: { id, companyId } })
      if (!existing) throw new NotFoundError('Solicitud')
      if (existing.status !== 'PENDING') throw new AppError('La solicitud no está pendiente de aprobación', 400)

      const r = await prisma.requisition.update({
        where: { id },
        data: { status: 'APPROVED', approvedById: userId },
        include: { requestedBy: { select: { id: true, name: true } } },
      })
      await writeAuditLog({ companyId, entity: 'requisition', entityId: id, action: 'approved', userId, userName, data: { number: existing.number, title: existing.title } })
      return reply.send({ data: r })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // ── REJECT (PENDING → REJECTED) ──────────────────────────────
  app.patch('/:id/reject', authenticate, async (request, reply) => {
    try {
      const { companyId, id: userId, name: userName, role } = request.user as any
      const { id } = request.params as any

      if (role !== 'ADMIN' && role !== 'APPROVER') {
        throw new AppError('No tenés permiso para rechazar solicitudes', 403)
      }

      const { reason } = (request.body as any) ?? {}
      const existing = await prisma.requisition.findFirst({ where: { id, companyId } })
      if (!existing) throw new NotFoundError('Solicitud')
      if (existing.status !== 'PENDING') throw new AppError('La solicitud no está pendiente de aprobación', 400)

      const r = await prisma.requisition.update({
        where: { id },
        data: { status: 'REJECTED', approvedById: userId, rejectionReason: reason ?? null },
        include: { requestedBy: { select: { id: true, name: true } } },
      })
      await writeAuditLog({ companyId, entity: 'requisition', entityId: id, action: 'rejected', userId, userName, data: { number: existing.number, title: existing.title, reason: reason ?? null } })
      return reply.send({ data: r })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // ── CONVERT TO PURCHASE (APPROVED → ORDERED) ──────────────────
  // Returns the items pre-formatted so the frontend can pre-fill the purchase form.
  // Actual purchase creation happens in /api/purchases as usual.
  app.get('/:id/purchase-prefill', authenticate, async (request, reply) => {
    try {
      const { companyId, role } = request.user as any
      const { id } = request.params as any

      if (role !== 'ADMIN' && role !== 'APPROVER') {
        throw new AppError('No tenés permiso para convertir solicitudes en compras', 403)
      }

      const r = await prisma.requisition.findFirst({
        where: { id, companyId },
        include: {
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
      })
      if (!r) throw new NotFoundError('Solicitud')
      if (r.status !== 'APPROVED') throw new AppError('La solicitud debe estar aprobada para convertirla en compra', 400)

      return reply.send({
        data: {
          requisitionId: r.id,
          requisitionNumber: r.number,
          items: r.items.map(item => ({
            productId: item.productId,
            description: item.description,
            quantity: Number(item.quantity),
            unit: item.unit,
            unitCost: item.estimatedCost ? Number(item.estimatedCost) : 0,
            total: item.estimatedCost ? Number(item.quantity) * Number(item.estimatedCost) : 0,
          })),
        },
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // ── MARK AS ORDERED (called after purchase is created) ────────
  app.patch('/:id/mark-ordered', authenticate, async (request, reply) => {
    try {
      const { companyId, id: userId, name: userName, role } = request.user as any
      const { id } = request.params as any
      const { purchaseId } = (request.body as any) ?? {}

      if (role !== 'ADMIN' && role !== 'APPROVER') {
        throw new AppError('No tenés permiso para esta acción', 403)
      }

      const existing = await prisma.requisition.findFirst({ where: { id, companyId } })
      if (!existing) throw new NotFoundError('Solicitud')
      if (existing.status !== 'APPROVED') throw new AppError('La solicitud debe estar aprobada', 400)

      const r = await prisma.requisition.update({
        where: { id },
        data: { status: 'ORDERED', purchaseId: purchaseId ?? null },
      })
      await writeAuditLog({ companyId, entity: 'requisition', entityId: id, action: 'ordered', userId, userName, data: { number: existing.number, purchaseId: purchaseId ?? null } })
      return reply.send({ data: r })
    } catch (err) {
      return handleError(reply, err)
    }
  })
}
