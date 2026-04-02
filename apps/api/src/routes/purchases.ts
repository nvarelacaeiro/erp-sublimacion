import { FastifyInstance } from 'fastify'
import { purchaseSchema } from '../shared'
import { MovementRefType, TransactionType, TransactionRefType } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { handleError, NotFoundError } from '../lib/errors'
import { getNextNumber } from '../services/numbering.service'
import { increaseStock } from '../services/stock.service'
import { createTransaction, createAccountPayable } from '../services/finance.service'

export async function purchaseRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // GET /api/purchases
  app.get('/', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { supplierId, from, to } = request.query as any

      const purchases = await prisma.purchase.findMany({
        where: {
          companyId,
          ...(supplierId && { supplierId }),
          ...((from || to) && {
            date: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }),
        },
        include: {
          supplier: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
        take: 100,
      })

      return reply.send({
        data: purchases.map(p => ({
          ...p,
          subtotal: Number(p.subtotal),
          total: Number(p.total),
          supplierName: p.supplier?.name ?? null,
          userName: p.user.name,
        })),
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // GET /api/purchases/:id
  app.get('/:id', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any

      const purchase = await prisma.purchase.findFirst({
        where: { id, companyId },
        include: {
          supplier: true,
          user: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
      })

      if (!purchase) throw new NotFoundError('Compra')

      return reply.send({
        data: {
          ...purchase,
          subtotal: Number(purchase.subtotal),
          total: Number(purchase.total),
          items: purchase.items.map(i => ({
            ...i,
            quantity: Number(i.quantity),
            unitCost: Number(i.unitCost),
            total: Number(i.total),
          })),
        },
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // POST /api/purchases  ← impacta stock + finanzas automáticamente
  app.post('/', authenticate, async (request, reply) => {
    try {
      const { companyId, id: userId } = request.user as any
      const input = purchaseSchema.parse(request.body)

      const subtotal = input.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0)
      const total = subtotal

      const purchase = await prisma.$transaction(async (tx) => {
        const number = await getNextNumber(tx as any, companyId, 'purchases')

        const newPurchase = await tx.purchase.create({
          data: {
            companyId,
            userId,
            supplierId: input.supplierId ?? null,
            number,
            date: input.date ? new Date(input.date) : new Date(),
            subtotal,
            total,
            notes: input.notes ?? null,
            items: {
              create: input.items.map(i => ({
                productId: i.productId ?? null,
                description: i.description,
                quantity: i.quantity,
                unitCost: i.unitCost,
                total: i.quantity * i.unitCost,
              })),
            },
          },
          include: { items: true },
        })

        // Aumentar stock
        await increaseStock(
          tx as any,
          companyId,
          newPurchase.items.map(i => ({ productId: i.productId, quantity: Number(i.quantity) })),
          MovementRefType.PURCHASE,
          newPurchase.id,
        )

        // Actualizar costo del producto (precio costo más reciente)
        for (const item of newPurchase.items) {
          if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: { cost: item.unitCost },
            })
          }
        }

        // Transacción financiera de egreso
        await createTransaction(tx as any, {
          companyId,
          type: TransactionType.EXPENSE,
          category: 'Compra',
          amount: total,
          description: `Compra #${number}`,
          refType: TransactionRefType.PURCHASE,
          refId: newPurchase.id,
          purchaseId: newPurchase.id,
        })

        // Cuenta a pagar si hay proveedor
        if (input.supplierId) {
          await createAccountPayable(tx as any, {
            companyId,
            supplierId: input.supplierId,
            purchaseId: newPurchase.id,
            amount: total,
          })
        }

        return newPurchase
      })

      return reply.code(201).send({ data: purchase })
    } catch (err) {
      return handleError(reply, err)
    }
  })
}
