import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { handleError, NotFoundError } from '../lib/errors'

const createSchema = z.object({
  name:        z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
})

export async function projectRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // ── LIST ─────────────────────────────────────────────────────
  app.get('/', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const projects = await prisma.project.findMany({
        where: { companyId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, description: true, createdAt: true, createdBy: { select: { name: true } } },
      })
      return reply.send({ data: projects })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // ── CREATE ───────────────────────────────────────────────────
  app.post('/', authenticate, async (request, reply) => {
    try {
      const { companyId, id: userId } = request.user as any
      const body = createSchema.parse(request.body)

      const project = await prisma.project.create({
        data: { companyId, name: body.name, description: body.description ?? null, createdById: userId },
        select: { id: true, name: true, description: true, createdAt: true },
      })
      return reply.code(201).send({ data: project })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // ── DELETE ───────────────────────────────────────────────────
  app.delete('/:id', authenticate, async (request, reply) => {
    try {
      const { companyId, role } = request.user as any
      if (role !== 'ADMIN') return reply.code(403).send({ error: 'Solo admins pueden eliminar obras' })
      const { id } = request.params as any
      const existing = await prisma.project.findFirst({ where: { id, companyId } })
      if (!existing) throw new NotFoundError('Obra')
      await prisma.project.delete({ where: { id } })
      return reply.send({ data: { ok: true } })
    } catch (err) {
      return handleError(reply, err)
    }
  })
}
