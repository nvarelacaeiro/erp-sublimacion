import { FastifyInstance } from 'fastify'
import { quoteSchema } from '../shared'
import { prisma } from '../lib/prisma'
import { handleError, NotFoundError, AppError } from '../lib/errors'
import { getNextNumber } from '../services/numbering.service'
import { decreaseStock } from '../services/stock.service'
import { createTransaction, createAccountReceivable } from '../services/finance.service'
import { MovementRefType, TransactionType, TransactionRefType, QuoteStatus } from '@prisma/client'

function calcItems(items: Array<{ quantity: number; unitPrice: number }>, discountPct: number) {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
  const discount = subtotal * (discountPct / 100)
  const total = subtotal - discount
  return { subtotal, discount, total }
}

export async function quoteRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // GET /api/quotes
  app.get('/', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { status, clientId, search } = request.query as any

      const quotes = await prisma.quote.findMany({
        where: {
          companyId,
          ...(status && { status }),
          ...(clientId && { clientId }),
          ...(search && {
            OR: [
              { number: { equals: Number(search) || undefined } },
              { client: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }),
        },
        include: {
          client: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
          items: { select: { description: true, quantity: true, unitPrice: true }, orderBy: { id: 'asc' } },
        },
        orderBy: { date: 'desc' },
        take: 100,
      })

      return reply.send({
        data: quotes.map(q => ({
          ...q,
          subtotal: Number(q.subtotal),
          discount: Number(q.discount),
          total: Number(q.total),
          clientName: q.client?.name ?? null,
          userName: q.user.name,
        })),
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // GET /api/quotes/:id
  app.get('/:id', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any

      const quote = await prisma.quote.findFirst({
        where: { id, companyId },
        include: {
          client: true,
          user: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
      })

      if (!quote) throw new NotFoundError('Presupuesto')

      return reply.send({
        data: {
          ...quote,
          subtotal: Number(quote.subtotal),
          discount: Number(quote.discount),
          total: Number(quote.total),
          items: quote.items.map(i => ({
            ...i,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            total: Number(i.total),
          })),
        },
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // POST /api/quotes
  app.post('/', authenticate, async (request, reply) => {
    try {
      const { companyId, id: userId } = request.user as any
      const input = quoteSchema.parse(request.body)
      const { subtotal, discount, total } = calcItems(input.items, input.discount ?? 0)

      const quote = await prisma.$transaction(async (tx) => {
        const number = await getNextNumber(tx as any, companyId, 'quotes')

        return tx.quote.create({
          data: {
            companyId,
            userId,
            clientId: input.clientId ?? null,
            number,
            validUntil: input.validUntil ? new Date(input.validUntil) : null,
            discount,
            subtotal,
            total,
            notes: input.notes ?? null,
            items: {
              create: input.items.map(i => ({
                productId: i.productId ?? null,
                description: i.description,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                total: i.quantity * i.unitPrice,
              })),
            },
          },
          include: { items: true },
        })
      })

      return reply.code(201).send({ data: quote })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // PUT /api/quotes/:id
  app.put('/:id', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any
      const input = quoteSchema.partial().parse(request.body)

      const existing = await prisma.quote.findFirst({ where: { id, companyId } })
      if (!existing) throw new NotFoundError('Presupuesto')
      if (existing.status !== 'PENDING') throw new AppError('Solo se pueden editar presupuestos pendientes')

      const items = input.items ?? []
      const { subtotal, discount, total } = items.length > 0
        ? calcItems(items, input.discount ?? Number(existing.discount))
        : { subtotal: Number(existing.subtotal), discount: Number(existing.discount), total: Number(existing.total) }

      const quote = await prisma.$transaction(async (tx) => {
        if (items.length > 0) {
          await tx.quoteItem.deleteMany({ where: { quoteId: id } })
        }

        return tx.quote.update({
          where: { id },
          data: {
            clientId: input.clientId !== undefined ? input.clientId : undefined,
            validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
            discount,
            subtotal,
            total,
            notes: input.notes !== undefined ? input.notes : undefined,
            ...(items.length > 0 && {
              items: {
                create: items.map(i => ({
                  productId: i.productId ?? null,
                  description: i.description,
                  quantity: i.quantity,
                  unitPrice: i.unitPrice,
                  total: i.quantity * i.unitPrice,
                })),
              },
            }),
          },
          include: { items: true },
        })
      })

      return reply.send({ data: quote })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // POST /api/quotes/:id/convert-to-sale  ← FLUJO CLAVE
  app.post('/:id/convert-to-sale', authenticate, async (request, reply) => {
    try {
      const { companyId, id: userId } = request.user as any
      const { id } = request.params as any
      const { paymentMethod } = request.body as any

      if (!paymentMethod) throw new AppError('El método de pago es requerido')

      const quote = await prisma.quote.findFirst({
        where: { id, companyId },
        include: { items: true },
      })

      if (!quote) throw new NotFoundError('Presupuesto')
      if (quote.status !== QuoteStatus.PENDING) {
        throw new AppError('Solo se pueden convertir presupuestos pendientes')
      }

      const sale = await prisma.$transaction(async (tx) => {
        // 1. Crear la venta
        const number = await getNextNumber(tx as any, companyId, 'sales')

        const newSale = await tx.sale.create({
          data: {
            companyId,
            userId,
            clientId: quote.clientId,
            quoteId: quote.id,
            number,
            paymentMethod,
            subtotal: quote.subtotal,
            discount: quote.discount,
            total: quote.total,
            notes: quote.notes,
            items: {
              create: quote.items.map(i => ({
                productId: i.productId,
                description: i.description,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                unitCost: 0, // se actualiza si hay producto
                total: i.total,
              })),
            },
          },
          include: { items: true },
        })

        // 2. Actualizar unitCost desde producto
        for (const item of newSale.items) {
          if (item.productId) {
            const product = await tx.product.findUnique({
              where: { id: item.productId },
              select: { cost: true },
            })
            if (product) {
              await tx.saleItem.update({
                where: { id: item.id },
                data: { unitCost: product.cost },
              })
            }
          }
        }

        // 3. Descontar stock
        await decreaseStock(
          tx as any,
          companyId,
          newSale.items.map(i => ({ productId: i.productId, quantity: Number(i.quantity) })),
          MovementRefType.SALE,
          newSale.id,
        )

        // 4. Registrar transacción financiera
        await createTransaction(tx as any, {
          companyId,
          type: TransactionType.INCOME,
          category: 'Venta',
          amount: Number(quote.total),
          description: `Venta #${number} (desde presupuesto #${quote.number})`,
          refType: TransactionRefType.SALE,
          refId: newSale.id,
          saleId: newSale.id,
        })

        // 5. Crear cuenta a cobrar si es crédito
        if (paymentMethod === 'CREDIT' && quote.clientId) {
          await createAccountReceivable(tx as any, {
            companyId,
            clientId: quote.clientId,
            saleId: newSale.id,
            amount: Number(quote.total),
          })
        }

        // 6. Marcar presupuesto como aprobado
        await tx.quote.update({
          where: { id: quote.id },
          data: { status: QuoteStatus.APPROVED },
        })

        return newSale
      })

      return reply.code(201).send({ data: sale })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // PATCH /api/quotes/:id/status
  app.patch('/:id/status', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any
      const { status } = request.body as any

      const validStatuses = ['PENDING', 'REJECTED', 'EXPIRED']
      if (!validStatuses.includes(status)) throw new AppError('Estado inválido')

      const existing = await prisma.quote.findFirst({ where: { id, companyId } })
      if (!existing) throw new NotFoundError('Presupuesto')

      const quote = await prisma.quote.update({ where: { id }, data: { status } })
      return reply.send({ data: quote })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // DELETE /api/quotes/:id
  app.delete('/:id', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any
      const existing = await prisma.quote.findFirst({ where: { id, companyId } })
      if (!existing) throw new NotFoundError('Presupuesto')
      if (existing.status === 'APPROVED') throw new AppError('No se puede eliminar un presupuesto aprobado')
      await prisma.quote.delete({ where: { id } })
      return reply.send({ data: { message: 'Presupuesto eliminado' } })
    } catch (err) {
      return handleError(reply, err)
    }
  })
}
