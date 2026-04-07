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

  // POST /api/suppliers/bulk-import
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
          const r = rows[i]
          const parsed = supplierSchema.parse({
            name: String(r.name ?? '').trim(),
            email: r.email ? String(r.email).trim() : null,
            phone: r.phone ?? r.telefono ?? null,
            address: r.address ?? r.direccion ?? null,
            taxId: r.taxId ?? r.tax_id ?? r.cuit ?? null,
            notes: r.notes ?? r.notas ?? null,
          })
          await prisma.supplier.create({ data: { ...parsed, companyId } })
          created.push(parsed.name)
        } catch (err: any) {
          errors.push({ row: i + 2, message: err?.errors?.[0]?.message ?? err.message ?? 'Error desconocido' })
        }
      }

      return reply.code(201).send({ data: { created: created.length, errors } })
    } catch (err) {
      return handleError(reply, err)
    }
  })
}
