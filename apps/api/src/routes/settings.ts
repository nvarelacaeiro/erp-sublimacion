import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { handleError, AppError } from '../lib/errors'

const settingsSchema = z.object({
  projectLabel: z.string().min(1).max(40).optional(), // "Obra", "Proyecto", "Cliente", etc.
})

export async function settingsRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // GET /api/settings
  app.get('/', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { settings: true },
      })
      return reply.send({ data: company?.settings ?? {} })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // PUT /api/settings — solo ADMIN
  app.put('/', authenticate, async (request, reply) => {
    try {
      const { companyId, role } = request.user as any
      if (role !== 'ADMIN') throw new AppError('Solo administradores pueden cambiar la configuración', 403)

      const body = settingsSchema.parse(request.body)

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { settings: true },
      })

      const currentSettings = (company?.settings as Record<string, any>) ?? {}
      const updated = await prisma.company.update({
        where: { id: companyId },
        data: { settings: { ...currentSettings, ...body } },
        select: { settings: true },
      })

      return reply.send({ data: updated.settings })
    } catch (err) {
      return handleError(reply, err)
    }
  })
}
