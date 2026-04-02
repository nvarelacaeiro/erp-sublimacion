import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { loginSchema } from '@erp/shared'
import { prisma } from '../lib/prisma'
import { handleError, AppError } from '../lib/errors'

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/login
  app.post('/login', async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body)

      const user = await prisma.user.findFirst({
        where: { email, active: true },
        include: { company: { select: { id: true, name: true } } },
      })

      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        throw new AppError('Email o contraseña incorrectos', 401)
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
        select: { id: true, companyId: true, name: true, email: true, role: true },
      })
      return reply.send({ data: user })
    } catch (err) {
      return handleError(reply, err)
    }
  })
}
