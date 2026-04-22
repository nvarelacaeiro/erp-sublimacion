import { FastifyInstance } from 'fastify'
import { productSchema, stockAdjustmentSchema } from '../shared'
import { MovementRefType } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { handleError, NotFoundError } from '../lib/errors'
import { decreaseStock, increaseStock } from '../services/stock.service'
import { assertPlanLimit } from '../lib/plan-limits'

const auth = { preHandler: [(app: any) => app.authenticate] }

export async function productRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // GET /api/products
  app.get('/', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { search, categoryId, lowStock } = request.query as any

      const products = await prisma.product.findMany({
        where: {
          companyId,
          active: true,
          ...(categoryId && { categoryId }),
          ...(search && { name: { contains: search, mode: 'insensitive' } }),
          ...(lowStock === 'true' && { stock: { lte: prisma.product.fields.minStock } }),
        },
        include: { category: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
      })

      // Filtrar low stock en JS (Prisma no soporta field comparison directamente)
      const result = lowStock === 'true'
        ? products.filter(p => Number(p.stock) <= Number(p.minStock))
        : products

      return reply.send({
        data: result.map(p => ({
          ...p,
          cost: Number(p.cost),
          price: Number(p.price),
          stock: Number(p.stock),
          minStock: Number(p.minStock),
          categoryName: p.category?.name ?? null,
        })),
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // GET /api/products/:id
  app.get('/:id', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any

      const product = await prisma.product.findFirst({
        where: { id, companyId },
        include: { category: true },
      })

      if (!product) throw new NotFoundError('Producto')

      return reply.send({
        data: {
          ...product,
          cost: Number(product.cost),
          price: Number(product.price),
          stock: Number(product.stock),
          minStock: Number(product.minStock),
        },
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // POST /api/products
  app.post('/', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any

      await assertPlanLimit(companyId, 'products')

      const data = productSchema.parse(request.body)

      const product = await prisma.product.create({
        data: { ...data, companyId },
      })

      return reply.code(201).send({ data: product })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // PUT /api/products/:id
  app.put('/:id', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any
      const data = productSchema.partial().parse(request.body)

      const existing = await prisma.product.findFirst({ where: { id, companyId } })
      if (!existing) throw new NotFoundError('Producto')

      const product = await prisma.product.update({ where: { id }, data })

      return reply.send({ data: product })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // DELETE /api/products/:id  (soft delete)
  app.delete('/:id', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any

      const existing = await prisma.product.findFirst({ where: { id, companyId } })
      if (!existing) throw new NotFoundError('Producto')

      await prisma.product.update({ where: { id }, data: { active: false } })

      return reply.send({ data: { message: 'Producto eliminado' } })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // POST /api/products/bulk-import
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
          const parsed = productSchema.parse({
            name: String(r.name ?? '').trim(),
            sku: r.sku ? String(r.sku).trim() : null,
            description: r.description ? String(r.description).trim() : null,
            cost: Number(r.cost ?? 0),
            price: Number(r.price ?? 0),
            stock: Number(r.stock ?? 0),
            minStock: Number(r.minStock ?? r.min_stock ?? 0),
            unit: r.unit ? String(r.unit).trim() : 'un',
          })

          // Resolve categoryId by name if provided
          let categoryId: string | null = null
          if (r.category) {
            const cat = await prisma.category.findFirst({
              where: { companyId, name: { equals: String(r.category).trim(), mode: 'insensitive' } },
            })
            if (cat) categoryId = cat.id
          }

          await prisma.product.create({ data: { ...parsed, companyId, categoryId } })
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

  // GET /api/products/:id/movements
  app.get('/:id/movements', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any

      const movements = await prisma.stockMovement.findMany({
        where: { productId: id, companyId },
        orderBy: { date: 'desc' },
        take: 50,
      })

      return reply.send({ data: movements.map(m => ({ ...m, quantity: Number(m.quantity) })) })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // POST /api/products/:id/adjust  (ajuste manual de stock)
  app.post('/:id/adjust', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any
      const { quantity, notes } = stockAdjustmentSchema.parse(request.body)

      const product = await prisma.product.findFirst({ where: { id, companyId } })
      if (!product) throw new NotFoundError('Producto')

      await prisma.$transaction(async (tx) => {
        if (quantity > 0) {
          await increaseStock(tx as any, companyId, [{ productId: id, quantity }], MovementRefType.ADJUSTMENT, id)
        } else {
          await decreaseStock(tx as any, companyId, [{ productId: id, quantity: Math.abs(quantity) }], MovementRefType.ADJUSTMENT, id)
        }
        await tx.stockMovement.updateMany({
          where: { productId: id, refType: 'ADJUSTMENT', refId: id },
          data: { notes },
        })
      })

      const updated = await prisma.product.findUnique({ where: { id } })
      if (!updated) throw new NotFoundError('Producto')

      // Reset stock alert if stock is now above minimum
      if (Number(updated.stock) > Number(updated.minStock) && updated.alertSent) {
        await prisma.product.update({
          where: { id },
          data: { alertSent: false, alertSentAt: null },
        })
      }

      return reply.send({ data: { stock: Number(updated.stock) } })
    } catch (err) {
      return handleError(reply, err)
    }
  })
}
