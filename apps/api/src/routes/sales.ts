import { FastifyInstance } from 'fastify'
import { saleSchema } from '../shared'
import { MovementRefType, TransactionType, TransactionRefType } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { handleError, NotFoundError, AppError } from '../lib/errors'
import { getNextNumber } from '../services/numbering.service'
import { decreaseStock } from '../services/stock.service'
import { createTransaction, createAccountReceivable } from '../services/finance.service'
import { writeAuditLog } from '../services/audit.service'

function calcItems(items: Array<{ quantity: number; unitPrice: number }>, discountPct: number) {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
  const discount = subtotal * (discountPct / 100)
  return { subtotal, discount, total: subtotal - discount }
}

export async function saleRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // GET /api/sales
  app.get('/', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { clientId, from, to, status } = request.query as any

      const sales = await prisma.sale.findMany({
        where: {
          companyId,
          ...(clientId && { clientId }),
          ...(status && { status }),
          ...(from || to) && {
            date: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          },
        },
        include: {
          client: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
        orderBy: { date: 'desc' },
        take: 100,
      })

      return reply.send({
        data: sales.map(s => ({
          ...s,
          subtotal: Number(s.subtotal),
          discount: Number(s.discount),
          total: Number(s.total),
          clientName: s.client?.name ?? null,
          userName: s.user.name,
          items: s.items.map(i => ({
            ...i,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            unitCost: Number(i.unitCost),
            total: Number(i.total),
          })),
        })),
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // GET /api/sales/:id
  app.get('/:id', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any

      const sale = await prisma.sale.findFirst({
        where: { id, companyId },
        include: {
          client: true,
          user: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
          quote: { select: { id: true, number: true } },
        },
      })

      if (!sale) throw new NotFoundError('Venta')

      return reply.send({
        data: {
          ...sale,
          subtotal: Number(sale.subtotal),
          discount: Number(sale.discount),
          total: Number(sale.total),
          items: sale.items.map(i => ({
            ...i,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            unitCost: Number(i.unitCost),
            total: Number(i.total),
          })),
        },
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // POST /api/sales  (venta directa, sin presupuesto previo)
  app.post('/', authenticate, async (request, reply) => {
    try {
      const { companyId, id: userId } = request.user as any
      const input = saleSchema.parse(request.body)
      const { subtotal, discount, total } = calcItems(input.items, input.discount ?? 0)

      const sale = await prisma.$transaction(async (tx) => {
        const number = await getNextNumber(tx as any, companyId, 'sales')

        // Obtener costos actuales de productos
        const productIds = input.items.map(i => i.productId).filter(Boolean) as string[]
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, cost: true },
        })
        const costMap = Object.fromEntries(products.map(p => [p.id, Number(p.cost)]))

        const newSale = await tx.sale.create({
          data: {
            companyId,
            userId,
            clientId: input.clientId ?? null,
            number,
            date: input.date ? new Date(input.date) : new Date(),
            paymentMethod: input.paymentMethod,
            subtotal,
            discount,
            total,
            notes: input.notes ?? null,
            items: {
              create: input.items.map(i => ({
                productId: i.productId ?? null,
                description: i.description,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                unitCost: i.productId ? (costMap[i.productId] ?? 0) : 0,
                total: i.quantity * i.unitPrice,
              })),
            },
          },
          include: { items: true },
        })

        // Descontar stock
        await decreaseStock(
          tx as any,
          companyId,
          newSale.items.map(i => ({ productId: i.productId, quantity: Number(i.quantity) })),
          MovementRefType.SALE,
          newSale.id,
        )

        // Transacción financiera
        await createTransaction(tx as any, {
          companyId,
          type: TransactionType.INCOME,
          category: 'Venta',
          amount: total,
          description: `Venta #${number}`,
          refType: TransactionRefType.SALE,
          refId: newSale.id,
          saleId: newSale.id,
        })

        // Cuenta a cobrar si es crédito
        if (input.paymentMethod === 'CREDIT' && input.clientId) {
          await createAccountReceivable(tx as any, {
            companyId,
            clientId: input.clientId,
            saleId: newSale.id,
            amount: total,
          })
        }

        return newSale
      })

      return reply.code(201).send({ data: sale })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // PATCH /api/sales/:id/cancel
  app.patch('/:id/cancel', authenticate, async (request, reply) => {
    try {
      const { companyId, id: userId, name: userName } = request.user as any
      const { id } = request.params as any

      const sale = await prisma.sale.findFirst({
        where: { id, companyId },
        include: { items: true },
      })
      if (!sale) throw new NotFoundError('Venta')
      if (sale.status === 'CANCELLED') throw new AppError('La venta ya está cancelada')

      await prisma.$transaction(async (tx) => {
        // Revertir stock
        for (const item of sale.items) {
          if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: Number(item.quantity) } },
            })
          }
        }

        // Registrar egreso compensatorio
        await createTransaction(tx as any, {
          companyId,
          type: TransactionType.EXPENSE,
          category: 'Cancelación de venta',
          amount: Number(sale.total),
          description: `Cancelación venta #${sale.number}`,
          refType: TransactionRefType.SALE,
          refId: sale.id,
          saleId: sale.id,
        })

        await tx.sale.update({ where: { id }, data: { status: 'CANCELLED' } })
      })

      await writeAuditLog({ companyId, entity: 'sale', entityId: id, action: 'cancelled', userId, userName, data: { number: sale.number, total: Number(sale.total) } })

      return reply.send({ data: { message: 'Venta cancelada' } })
    } catch (err) {
      return handleError(reply, err)
    }
  })
}
