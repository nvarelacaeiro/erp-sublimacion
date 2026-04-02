import { FastifyInstance } from 'fastify'
import { supplierSchema } from '../shared'
import { prisma } from '../lib/prisma'
import { handleError, NotFoundError } from '../lib/errors'

export async function supplierRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  app.get('/', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { search } = request.query as any

      const suppliers = await prisma.supplier.findMany({
        where: {
          companyId,
          active: true,
          ...(search && { name: { contains: search, mode: 'insensitive' } }),
        },
        orderBy: { name: 'asc' },
      })
      return reply.send({ data: suppliers })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  app.get('/:id', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any
      const supplier = await prisma.supplier.findFirst({ where: { id, companyId } })
      if (!supplier) throw new NotFoundError('Proveedor')
      return reply.send({ data: supplier })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  app.post('/', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const data = supplierSchema.parse(request.body)
      const supplier = await prisma.supplier.create({ data: { ...data, companyId } })
      return reply.code(201).send({ data: supplier })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  app.put('/:id', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any
      const data = supplierSchema.partial().parse(request.body)
      const existing = await prisma.supplier.findFirst({ where: { id, companyId } })
      if (!existing) throw new NotFoundError('Proveedor')
      const supplier = await prisma.supplier.update({ where: { id }, data })
      return reply.send({ data: supplier })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  app.delete('/:id', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any
      const existing = await prisma.supplier.findFirst({ where: { id, companyId } })
      if (!existing) throw new NotFoundError('Proveedor')
      await prisma.supplier.update({ where: { id }, data: { active: false } })
      return reply.send({ data: { message: 'Proveedor eliminado' } })
    } catch (err) {
      return handleError(reply, err)
    }
  })
}
