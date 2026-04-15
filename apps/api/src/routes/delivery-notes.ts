import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { handleError, NotFoundError } from '../lib/errors'

const createSchema = z.object({
  saleId: z.string().min(1),
  notes: z.string().optional().nullable(),
})

async function getNextDeliveryNumber(companyId: string): Promise<number> {
  const max = await prisma.deliveryNote.aggregate({
    where: { companyId },
    _max: { number: true },
  })
  return (max._max.number ?? 0) + 1
}

export async function deliveryNoteRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // ── LIST (optionally filtered by saleId) ─────────────────────
  app.get('/', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { saleId, from, to } = request.query as any

      const where: any = { companyId }
      if (saleId) where.saleId = saleId
      if (from || to) {
        where.date = {}
        if (from) where.date.gte = new Date(from)
        if (to) where.date.lte = new Date(to + 'T23:59:59')
      }

      const notes = await prisma.deliveryNote.findMany({
        where,
        include: {
          sale: {
            select: {
              id: true,
              number: true,
              client: { select: { id: true, name: true } },
              total: true,
              items: {
                include: { product: { select: { id: true, name: true, sku: true } } },
              },
            },
          },
        },
        orderBy: { date: 'desc' },
      })

      return reply.send({
        data: notes.map(n => ({
          ...n,
          sale: {
            ...n.sale,
            total: Number(n.sale.total),
            items: n.sale.items.map(i => ({
              ...i,
              quantity: Number(i.quantity),
              unitPrice: Number(i.unitPrice),
              unitCost: Number(i.unitCost),
              total: Number(i.total),
            })),
          },
        })),
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // ── CREATE ───────────────────────────────────────────────────
  app.post('/', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { saleId, notes } = createSchema.parse(request.body)

      // Verify sale belongs to this company
      const sale = await prisma.sale.findFirst({ where: { id: saleId, companyId } })
      if (!sale) throw new NotFoundError('Venta')

      const number = await getNextDeliveryNumber(companyId)

      const note = await prisma.deliveryNote.create({
        data: { companyId, saleId, number, notes: notes ?? null },
        include: {
          sale: {
            select: {
              id: true,
              number: true,
              client: { select: { id: true, name: true } },
              total: true,
              items: {
                include: { product: { select: { id: true, name: true, sku: true } } },
              },
            },
          },
        },
      })

      return reply.code(201).send({
        data: {
          ...note,
          sale: {
            ...note.sale,
            total: Number(note.sale.total),
            items: note.sale.items.map(i => ({
              ...i,
              quantity: Number(i.quantity),
              unitPrice: Number(i.unitPrice),
              unitCost: Number(i.unitCost),
              total: Number(i.total),
            })),
          },
        },
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // ── DELETE ───────────────────────────────────────────────────
  app.delete('/:id', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any

      const existing = await prisma.deliveryNote.findFirst({ where: { id, companyId } })
      if (!existing) throw new NotFoundError('Remito')

      await prisma.deliveryNote.delete({ where: { id } })
      return reply.send({ data: { message: 'Remito eliminado' } })
    } catch (err) {
      return handleError(reply, err)
    }
  })
}
