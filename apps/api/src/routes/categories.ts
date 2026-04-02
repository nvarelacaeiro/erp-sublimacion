import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { handleError, NotFoundError } from '../lib/errors'

const categorySchema = z.object({ name: z.string().min(1).max(50) })

export async function categoryRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  app.get('/', authenticate, async (request, reply) => {
    const { companyId } = request.user as any
    const categories = await prisma.category.findMany({
      where: { companyId },
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    })
    return reply.send({ data: categories })
  })

  app.post('/', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { name } = categorySchema.parse(request.body)
      const category = await prisma.category.create({ data: { companyId, name } })
      return reply.code(201).send({ data: category })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  app.put('/:id', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any
      const { name } = categorySchema.parse(request.body)
      const existing = await prisma.category.findFirst({ where: { id, companyId } })
      if (!existing) throw new NotFoundError('Categoría')
      const category = await prisma.category.update({ where: { id }, data: { name } })
      return reply.send({ data: category })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  app.delete('/:id', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any
      const existing = await prisma.category.findFirst({ where: { id, companyId } })
      if (!existing) throw new NotFoundError('Categoría')
      await prisma.category.delete({ where: { id } })
      return reply.send({ data: { message: 'Categoría eliminada' } })
    } catch (err) {
      return handleError(reply, err)
    }
  })
}
