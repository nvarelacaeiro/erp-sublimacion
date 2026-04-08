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

      const existing = await prisma.category.findFirst({
        where: { companyId, name: { equals: name, mode: 'insensitive' } },
      })
      if (existing) {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'Ya existe una categoría con ese nombre',
          statusCode: 409,
        })
      }

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

  // POST /api/categories/bulk-import
  app.post('/bulk-import', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { rows } = request.body as { rows: any[] }
      if (!Array.isArray(rows) || rows.length === 0) {
        return reply.code(400).send({ error: 'Bad Request', message: 'No hay filas para importar', statusCode: 400 })
      }

      const created: string[] = []
      const errors: { row: number; message: string }[] = []

      for (let i = 0; i < rows.length; i++) {
        try {
          const name = String(rows[i].name ?? rows[i].nombre ?? '').trim()
          if (!name) throw new Error('El nombre es requerido')
          const existing = await prisma.category.findFirst({
            where: { companyId, name: { equals: name, mode: 'insensitive' } },
          })
          if (!existing) {
            await prisma.category.create({ data: { companyId, name } })
            created.push(name)
          }
        } catch (err: any) {
          errors.push({ row: i + 2, message: err.message ?? 'Error desconocido' })
        }
      }

      return reply.code(201).send({ data: { created: created.length, errors } })
    } catch (err) {
      return handleError(reply, err)
    }
  })
}
