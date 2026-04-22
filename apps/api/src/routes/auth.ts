import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { loginSchema } from '../shared'
import { prisma } from '../lib/prisma'
import { handleError, AppError } from '../lib/errors'

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/login
  app.post('/login', async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body)

      const user = await prisma.user.findFirst({
        where: { email, active: true },
        include: { company: { select: { id: true, name: true, active: true, suspended: true, plan: true, trialEndsAt: true } } },
      })

      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        throw new AppError('Email o contraseña incorrectos', 401)
      }

      // Verificar estado de la empresa
      const co = user.company
      if (!co.active) {
        throw new AppError('Tu cuenta está desactivada. Contactá a soporte.', 403)
      }
      if (co.plan === 'TRIAL' && co.trialEndsAt && co.trialEndsAt < new Date()) {
        // Auto-suspender
        await prisma.company.update({ where: { id: co.id }, data: { suspended: true } })
        throw new AppError('El período de prueba ha vencido. Contactá a soporte para continuar.', 403)
      }
      if (co.suspended) {
        throw new AppError('Tu cuenta está suspendida. Contactá a soporte.', 403)
      }

      const payload = {
        id: user.id,
        companyId: user.companyId,
        name: user.name,
        email: user.email,
        role: user.role,
      }

      const token = app.jwt.sign(payload, { expiresIn: '7d' })

      reply.setCookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 días
        path: '/',
      })

      return reply.send({ data: { user: payload, accessToken: token } })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // POST /api/auth/logout
  app.post('/logout', async (request, reply) => {
    reply.clearCookie('token', { path: '/' })
    return reply.send({ data: { message: 'Sesión cerrada' } })
  })

  // GET /api/auth/me
  app.get('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: (request.user as any).id },
        select: { id: true, companyId: true, name: true, email: true, role: true, phone: true },
      })
      return reply.send({ data: user })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // PUT /api/auth/profile
  app.put('/profile', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.user as any
      const schema = z.object({
        name:     z.string().min(1).max(100).optional(),
        phone:    z.string().max(20).nullable().optional(),
        password: z.string().min(6).optional(),
      })
      const body = schema.parse(request.body)

      const data: any = {}
      if (body.name    !== undefined) data.name  = body.name
      if (body.phone   !== undefined) data.phone = body.phone
      if (body.password) data.passwordHash = await bcrypt.hash(body.password, 10)

      const user = await prisma.user.update({
        where: { id },
        data,
        select: { id: true, companyId: true, name: true, email: true, role: true, phone: true },
      })
      return reply.send({ data: user })
    } catch (err) {
      return handleError(reply, err)
    }
  })
}
