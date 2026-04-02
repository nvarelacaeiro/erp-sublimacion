import { FastifyInstance } from 'fastify'
import { clientSchema } from '@erp/shared'
import { prisma } from '../lib/prisma'
import { handleError, NotFoundError } from '../lib/errors'

export async function clientRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // GET /api/clients
  app.get('/', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { search } = request.query as any

      const clients = await prisma.client.findMany({
        where: {
          companyId,
          active: true,
          ...(search && { name: { contains: search, mode: 'insensitive' } }),
        },
        include: {
          accountsRecv: {
            where: { status: { not: 'PAID' } },
            select: { amount: true, amountPaid: true },
          },
        },
        orderBy: { name: 'asc' },
      })

      return reply.send({
        data: clients.map(c => ({
          ...c,
          totalDebt: c.accountsRecv.reduce(
            (sum, ar) => sum + Number(ar.amount) - Number(ar.amountPaid),
            0,
          ),
          accountsRecv: undefined,
        })),
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // GET /api/clients/:id
  app.get('/:id', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any

      const client = await prisma.client.findFirst({ where: { id, companyId } })
      if (!client) throw new NotFoundError('Cliente')

      return reply.send({ data: client })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // GET /api/clients/:id/history
  app.get('/:id/history', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any

      const client = await prisma.client.findFirst({ where: { id, companyId } })
      if (!client) throw new NotFoundError('Cliente')

      const [sales, quotes, debt] = await Promise.all([
        prisma.sale.findMany({
          where: { clientId: id, companyId },
          select: { id: true, number: true, date: true, total: true, status: true, paymentMethod: true },
          orderBy: { date: 'desc' },
          take: 20,
        }),
        prisma.quote.findMany({
          where: { clientId: id, companyId },
          select: { id: true, number: true, date: true, total: true, status: true },
          orderBy: { date: 'desc' },
          take: 20,
        }),
        prisma.accountReceivable.findMany({
          where: { clientId: id, companyId, status: { not: 'PAID' } },
          select: { id: true, amount: true, amountPaid: true, dueDate: true, status: true },
        }),
      ])

      return reply.send({
        data: {
          client,
          sales: sales.map(s => ({ ...s, total: Number(s.total) })),
          quotes: quotes.map(q => ({ ...q, total: Number(q.total) })),
          pendingDebt: debt.reduce((sum, ar) => sum + Number(ar.amount) - Number(ar.amountPaid), 0),
          accountsReceivable: debt,
        },
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // POST /api/clients
  app.post('/', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const data = clientSchema.parse(request.body)
      const client = await prisma.client.create({ data: { ...data, companyId } })
      return reply.code(201).send({ data: client })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // PUT /api/clients/:id
  app.put('/:id', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any
      const data = clientSchema.partial().parse(request.body)

      const existing = await prisma.client.findFirst({ where: { id, companyId } })
      if (!existing) throw new NotFoundError('Cliente')

      const client = await prisma.client.update({ where: { id }, data })
      return reply.send({ data: client })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // DELETE /api/clients/:id  (soft delete)
  app.delete('/:id', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any

      const existing = await prisma.client.findFirst({ where: { id, companyId } })
      if (!existing) throw new NotFoundError('Cliente')

      await prisma.client.update({ where: { id }, data: { active: false } })
      return reply.send({ data: { message: 'Cliente eliminado' } })
    } catch (err) {
      return handleError(reply, err)
    }
  })
}
