import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { handleError, NotFoundError, AppError } from '../lib/errors'

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  role: z.enum(['ADMIN', 'SELLER']).default('SELLER'),
})

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'SELLER']).optional(),
  password: z.string().min(6).optional(),
  active: z.boolean().optional(),
})

export async function userRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // GET /api/users
  app.get('/', authenticate, async (request, reply) => {
    try {
      const { companyId, role } = request.user as any
      if (role !== 'ADMIN') throw new AppError('Solo administradores pueden ver usuarios', 403)

      const users = await prisma.user.findMany({
        where: { companyId },
        select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
        orderBy: { name: 'asc' },
      })

      return reply.send({ data: users })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // POST /api/users
  app.post('/', authenticate, async (request, reply) => {
    try {
      const { companyId, role } = request.user as any
      if (role !== 'ADMIN') throw new AppError('Solo administradores pueden crear usuarios', 403)

      const input = createUserSchema.parse(request.body)

      const existing = await prisma.user.findFirst({
        where: { email: input.email, companyId },
      })
      if (existing) throw new AppError('Ya existe un usuario con ese email')

      const passwordHash = await bcrypt.hash(input.password, 10)

      const user = await prisma.user.create({
        data: {
          companyId,
          name: input.name,
          email: input.email,
          passwordHash,
          role: input.role,
        },
        select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      })

      return reply.code(201).send({ data: user })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // PUT /api/users/:id
  app.put('/:id', authenticate, async (request, reply) => {
    try {
      const { companyId, role, id: currentUserId } = request.user as any
      const { id } = request.params as any
      if (role !== 'ADMIN') throw new AppError('Solo administradores pueden editar usuarios', 403)

      const input = updateUserSchema.parse(request.body)

      const existing = await prisma.user.findFirst({ where: { id, companyId } })
      if (!existing) throw new NotFoundError('Usuario')

      const updateData: any = {
        ...(input.name && { name: input.name }),
        ...(input.email && { email: input.email }),
        ...(input.role && { role: input.role }),
        ...(input.active !== undefined && { active: input.active }),
      }

      if (input.password) {
        updateData.passwordHash = await bcrypt.hash(input.password, 10)
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      })

      return reply.send({ data: user })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // DELETE /api/users/:id
  app.delete('/:id', authenticate, async (request, reply) => {
    try {
      const { companyId, role, id: currentUserId } = request.user as any
      const { id } = request.params as any
      if (role !== 'ADMIN') throw new AppError('Solo administradores pueden eliminar usuarios', 403)
      if (id === currentUserId) throw new AppError('No podés eliminar tu propia cuenta')

      const existing = await prisma.user.findFirst({ where: { id, companyId } })
      if (!existing) throw new NotFoundError('Usuario')

      // Soft delete
      await prisma.user.update({ where: { id }, data: { active: false } })

      return reply.send({ data: { message: 'Usuario desactivado' } })
    } catch (err) {
      return handleError(reply, err)
    }
  })
}
