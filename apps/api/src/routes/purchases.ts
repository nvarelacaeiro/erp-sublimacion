import { FastifyInstance } from 'fastify'
import { purchaseSchema } from '../shared'
import { z } from 'zod'
import { MovementRefType, TransactionType, TransactionRefType } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { handleError, NotFoundError, AppError } from '../lib/errors'
import { getNextNumber } from '../services/numbering.service'
import { increaseStock } from '../services/stock.service'
import { createTransaction, createAccountPayable } from '../services/finance.service'

// Cast to any so new enum value 'PAID' compiles before prisma generate runs on Railway
const db = prisma as any

export async function purchaseRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // GET /api/purchases
  app.get('/', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { supplierId, from, to, status } = request.query as any

      const purchases = await prisma.purchase.findMany({
        where: {
          companyId,
          ...(supplierId && { supplierId }),
          ...(status && { status }),
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
          supplierName: (p as any).supplier?.name ?? null,
          userName: (p as any).user.name,
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
          items: (purchase as any).items.map((i: any) => ({
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

  // POST /api/purchases
  app.post('/', authenticate, async (request, reply) => {
    try {
      const { companyId, id: userId } = request.user as any

      const input = purchaseSchema
        .extend({ paid: z.boolean().default(true) })
        .parse(request.body)

      const subtotal = input.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0)
      const total = subtotal

      const purchase = await prisma.$transaction(async (tx) => {
        const number = await getNextNumber(tx as any, companyId, 'purchases')

        const newPurchase = await (tx as any).purchase.create({
          data: {
            companyId,
            userId,
            supplierId: input.supplierId ?? null,
            number,
            date: input.date ? new Date(input.date) : new Date(),
            paid: input.paid,
            status: input.paid ? 'PAID' : 'PENDING',
            paidAt: input.paid ? new Date() : null,
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

        // Siempre aumentar stock (se recibió la mercadería)
        await increaseStock(
          tx as any,
          companyId,
          newPurchase.items.map((i: any) => ({ productId: i.productId, quantity: Number(i.quantity) })),
          MovementRefType.PURCHASE,
          newPurchase.id,
        )

        // Actualizar costo del producto
        for (const item of newPurchase.items) {
          if ((item as any).productId) {
            await (tx as any).product.update({
              where: { id: (item as any).productId },
              data: { cost: (item as any).unitCost },
            })
          }
        }

        if (input.paid) {
          // Compra pagada → egreso inmediato
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
        } else if (input.supplierId) {
          // Compra pendiente con proveedor → cuenta a pagar, sin egreso
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

  // PATCH /api/purchases/:id/pay  — marcar compra pendiente como pagada
  app.patch('/:id/pay', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any

      const purchase = await db.purchase.findFirst({
        where: { id, companyId },
        include: { accountsPay: true },
      })
      if (!purchase) throw new NotFoundError('Compra')
      if (purchase.status === 'PAID') throw new AppError('La compra ya está pagada')

      await prisma.$transaction(async (tx) => {
        await (tx as any).purchase.update({
          where: { id },
          data: { paid: true, status: 'PAID', paidAt: new Date() },
        })

        await createTransaction(tx as any, {
          companyId,
          type: TransactionType.EXPENSE,
          category: 'Compra',
          amount: Number(purchase.total),
          description: `Pago compra #${purchase.number}`,
          refType: TransactionRefType.PURCHASE,
          refId: purchase.id,
          purchaseId: purchase.id,
        })

        for (const ap of purchase.accountsPay) {
          await (tx as any).accountPayable.update({
            where: { id: ap.id },
            data: {
              status: 'PAID',
              amountPaid: purchase.total,
              paidAt: new Date(),
            },
          })
        }
      })

      return reply.send({ data: { message: 'Compra marcada como pagada' } })
    } catch (err) {
      return handleError(reply, err)
    }
  })
}
