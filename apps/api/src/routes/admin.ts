import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { getCompanyUsage } from '../lib/plan-limits'

// ── Protección por clave secreta en header X-Admin-Key ────────
function requireAdminKey(request: any, reply: any): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) {
    reply.code(503).send({ error: 'Admin API no configurada. Definí ADMIN_SECRET en el .env.' })
    return false
  }
  if (request.headers['x-admin-key'] !== secret) {
    reply.code(401).send({ error: 'Clave de admin inválida.' })
    return false
  }
  return true
}

export async function adminRoutes(app: FastifyInstance) {
  // ── GET /api/admin/companies ─────────────────────────────────
  app.get('/companies', async (request, reply) => {
    if (!requireAdminKey(request, reply)) return

    const companies = await prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { users: true, products: true, clients: true, sales: true },
        },
      },
    })

    return reply.send({ data: companies })
  })

  // ── GET /api/admin/companies/:id ─────────────────────────────
  app.get('/companies/:id', async (request, reply) => {
    if (!requireAdminKey(request, reply)) return

    const { id } = request.params as { id: string }

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { products: true, clients: true, sales: true, purchases: true, requisitions: true },
        },
      },
    })

    if (!company) return reply.code(404).send({ error: 'Empresa no encontrada.' })

    const usage = await getCompanyUsage(id)

    return reply.send({ data: { ...company, usage } })
  })

  // ── POST /api/admin/companies ────────────────────────────────
  // Crea empresa + primer usuario ADMIN
  app.post('/companies', async (request, reply) => {
    if (!requireAdminKey(request, reply)) return

    const schema = z.object({
      // Empresa
      name:       z.string().min(2),
      slug:       z.string().min(2).regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
      plan:       z.enum(['TRIAL', 'STARTER', 'PRO']).default('TRIAL'),
      trialDays:  z.number().int().min(1).default(14),
      // Primer usuario admin
      adminName:     z.string().min(2),
      adminEmail:    z.string().email(),
      adminPassword: z.string().min(6),
    })

    const body = schema.parse(request.body)

    const existing = await prisma.company.findUnique({ where: { slug: body.slug } })
    if (existing) {
      return reply.code(409).send({ error: `El slug "${body.slug}" ya está en uso.` })
    }

    const trialEndsAt = body.plan === 'TRIAL'
      ? new Date(Date.now() + body.trialDays * 24 * 60 * 60 * 1000)
      : null

    const company = await prisma.company.create({
      data: {
        name: body.name,
        slug: body.slug,
        plan: body.plan,
        trialEndsAt,
        users: {
          create: {
            name:         body.adminName,
            email:        body.adminEmail,
            passwordHash: await bcrypt.hash(body.adminPassword, 10),
            role:         'ADMIN',
          },
        },
      },
      include: {
        users: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    return reply.code(201).send({ data: company })
  })

  // ── PATCH /api/admin/companies/:id ───────────────────────────
  app.patch('/companies/:id', async (request, reply) => {
    if (!requireAdminKey(request, reply)) return

    const { id } = request.params as { id: string }

    const schema = z.object({
      name:        z.string().min(2).optional(),
      slug:        z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
      plan:        z.enum(['TRIAL', 'STARTER', 'PRO']).optional(),
      active:      z.boolean().optional(),
      trialEndsAt: z.string().datetime().nullable().optional(),
    })

    const body = schema.parse(request.body)

    // Verificar unicidad de slug si se cambia
    if (body.slug) {
      const conflict = await prisma.company.findFirst({
        where: { slug: body.slug, NOT: { id } },
      })
      if (conflict) {
        return reply.code(409).send({ error: `El slug "${body.slug}" ya está en uso.` })
      }
    }

    const company = await prisma.company.update({
      where: { id },
      data: {
        ...(body.name        !== undefined && { name: body.name }),
        ...(body.slug        !== undefined && { slug: body.slug }),
        ...(body.plan        !== undefined && { plan: body.plan }),
        ...(body.active      !== undefined && { active: body.active }),
        ...(body.trialEndsAt !== undefined && {
          trialEndsAt: body.trialEndsAt ? new Date(body.trialEndsAt) : null,
        }),
      },
    })

    return reply.send({ data: company })
  })

  // ── POST /api/admin/companies/:id/suspend ───────────────────
  app.post('/companies/:id/suspend', async (request, reply) => {
    if (!requireAdminKey(request, reply)) return
    const { id } = request.params as { id: string }
    const company = await prisma.company.update({
      where: { id },
      data: { suspended: true },
    })
    return reply.send({ data: company })
  })

  // ── POST /api/admin/companies/:id/unsuspend ──────────────────
  app.post('/companies/:id/unsuspend', async (request, reply) => {
    if (!requireAdminKey(request, reply)) return
    const { id } = request.params as { id: string }
    const company = await prisma.company.update({
      where: { id },
      data: { suspended: false },
    })
    return reply.send({ data: company })
  })

  // ── POST /api/admin/companies/:id/users ──────────────────────
  // Agregar usuario a una empresa existente
  app.post('/companies/:id/users', async (request, reply) => {
    if (!requireAdminKey(request, reply)) return

    const { id: companyId } = request.params as { id: string }

    const schema = z.object({
      name:     z.string().min(2),
      email:    z.string().email(),
      password: z.string().min(6),
      role:     z.enum(['ADMIN', 'SELLER', 'APPROVER', 'REQUESTER']).default('SELLER'),
    })

    const body = schema.parse(request.body)

    const company = await prisma.company.findUnique({ where: { id: companyId } })
    if (!company) return reply.code(404).send({ error: 'Empresa no encontrada.' })

    const existing = await prisma.user.findUnique({
      where: { companyId_email: { companyId, email: body.email } },
    })
    if (existing) {
      return reply.code(409).send({ error: 'Ya existe un usuario con ese email en esta empresa.' })
    }

    const user = await prisma.user.create({
      data: {
        companyId,
        name:         body.name,
        email:        body.email,
        passwordHash: await bcrypt.hash(body.password, 10),
        role:         body.role,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })

    return reply.code(201).send({ data: user })
  })
}
