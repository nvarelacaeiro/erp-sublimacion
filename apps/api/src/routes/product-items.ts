import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { handleError, NotFoundError } from '../lib/errors'

// Alias typed as any because local Prisma client hasn't been regenerated yet;
// Railway will regenerate on build with the new schema.
const db = prisma as any

const itemSchema = z.object({
  name: z.string().min(1).max(100),
  cost: z.number().min(0),
  type: z.enum(['QUANTITY', 'BOOLEAN']).default('QUANTITY'),
})

const ruleSchema = z.object({
  minQty: z.number().int().min(1),
  maxQty: z.number().int().nullable().optional(),
  marginPercentage: z.number().min(0).max(1000),
})

export async function productItemRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // GET /api/products/:productId/items
  app.get('/:productId/items', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { productId } = request.params as any

      const product = await prisma.product.findFirst({ where: { id: productId, companyId } })
      if (!product) throw new NotFoundError('Producto')

      const [items, rules] = await Promise.all([
        db.productItem.findMany({
          where: { productId, active: true },
          orderBy: { createdAt: 'asc' },
        }),
        db.pricingRule.findMany({
          where: { productId },
          orderBy: { minQty: 'asc' },
        }),
      ])

      return reply.send({
        data: {
          items: items.map((i: any) => ({ ...i, cost: Number(i.cost) })),
          pricingRules: rules.map((r: any) => ({
            ...r,
            marginPercentage: Number(r.marginPercentage),
          })),
        },
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // POST /api/products/:productId/items
  app.post('/:productId/items', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { productId } = request.params as any

      const product = await prisma.product.findFirst({ where: { id: productId, companyId } })
      if (!product) throw new NotFoundError('Producto')

      const input = itemSchema.parse(request.body)
      const item = await db.productItem.create({ data: { productId, ...input } })

      return reply.code(201).send({ data: { ...item, cost: Number(item.cost) } })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // PUT /api/products/:productId/items/:itemId
  app.put('/:productId/items/:itemId', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { productId, itemId } = request.params as any

      const product = await prisma.product.findFirst({ where: { id: productId, companyId } })
      if (!product) throw new NotFoundError('Producto')

      const input = itemSchema.partial().parse(request.body)
      const item = await db.productItem.update({ where: { id: itemId }, data: input })

      return reply.send({ data: { ...item, cost: Number(item.cost) } })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // DELETE /api/products/:productId/items/:itemId
  app.delete('/:productId/items/:itemId', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { productId, itemId } = request.params as any

      const product = await prisma.product.findFirst({ where: { id: productId, companyId } })
      if (!product) throw new NotFoundError('Producto')

      await db.productItem.update({ where: { id: itemId }, data: { active: false } })
      return reply.send({ data: { message: 'Ítem eliminado' } })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // PUT /api/products/:productId/pricing-rules  (replace all rules atomically)
  app.put('/:productId/pricing-rules', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { productId } = request.params as any

      const product = await prisma.product.findFirst({ where: { id: productId, companyId } })
      if (!product) throw new NotFoundError('Producto')

      const { rules } = z.object({ rules: z.array(ruleSchema) }).parse(request.body)

      await prisma.$transaction(async (tx: any) => {
        await tx.pricingRule.deleteMany({ where: { productId } })
        if (rules.length > 0) {
          await tx.pricingRule.createMany({
            data: rules.map((r: any) => ({ productId, ...r })),
          })
        }
      })

      const saved = await db.pricingRule.findMany({
        where: { productId },
        orderBy: { minQty: 'asc' },
      })

      return reply.send({
        data: saved.map((r: any) => ({ ...r, marginPercentage: Number(r.marginPercentage) })),
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // POST /api/products/:productId/calculate-price
  app.post('/:productId/calculate-price', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { productId } = request.params as any

      const { quantity, selectedItems } = z.object({
        quantity: z.number().positive(),
        selectedItems: z.array(z.object({
          itemId: z.string(),
          qty: z.number().min(0),
        })).default([]),
      }).parse(request.body)

      const product = await prisma.product.findFirst({ where: { id: productId, companyId } })
      if (!product) throw new NotFoundError('Producto')

      const [productItems, pricingRules] = await Promise.all([
        db.productItem.findMany({ where: { productId, active: true } }),
        db.pricingRule.findMany({ where: { productId }, orderBy: { minQty: 'asc' } }),
      ])

      const baseCost = Number(product.cost)

      let extraCost = 0
      for (const sel of selectedItems) {
        const item = productItems.find((i: any) => i.id === sel.itemId)
        if (!item) continue
        if (item.type === 'BOOLEAN') {
          extraCost += sel.qty > 0 ? Number(item.cost) : 0
        } else {
          extraCost += Number(item.cost) * sel.qty
        }
      }

      const totalCost = baseCost + extraCost

      const rule = pricingRules.find((r: any) => {
        return quantity >= r.minQty && (r.maxQty === null || quantity <= r.maxQty)
      })

      const margin = rule ? Number(rule.marginPercentage) : 0
      const unitPrice = Math.round(totalCost * (1 + margin / 100) * 100) / 100

      return reply.send({
        data: {
          baseCost,
          extraCost,
          totalCost,
          margin,
          unitPrice,
          ruleApplied: rule
            ? { minQty: rule.minQty, maxQty: rule.maxQty, margin }
            : null,
        },
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })
}
