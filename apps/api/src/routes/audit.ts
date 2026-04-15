import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { handleError } from '../lib/errors'

export async function auditRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // GET /api/audit?entity=sale&entityId=xxx
  app.get('/', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { entity, entityId, limit = '20' } = request.query as any

      const logs = await prisma.auditLog.findMany({
        where: {
          companyId,
          ...(entity && { entity }),
          ...(entityId && { entityId }),
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(Number(limit), 100),
      })

      return reply.send({ data: logs })
    } catch (err) {
      return handleError(reply, err)
    }
  })
}
