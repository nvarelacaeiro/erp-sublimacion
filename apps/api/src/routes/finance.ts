import { FastifyInstance } from 'fastify'
import { transactionSchema, payAccountSchema } from '../shared'
import { TransactionType, TransactionRefType, AccountStatus } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { handleError, NotFoundError, AppError } from '../lib/errors'
import { createTransaction } from '../services/finance.service'

export async function financeRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // GET /api/finance/transactions
  app.get('/transactions', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { from, to, type } = request.query as any

      const transactions = await prisma.transaction.findMany({
        where: {
          companyId,
          ...(type && { type }),
          ...((from || to) && {
            date: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }),
        },
        orderBy: { date: 'desc' },
        take: 200,
      })

      return reply.send({
        data: transactions.map(t => ({ ...t, amount: Number(t.amount) })),
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // POST /api/finance/transactions  (transacción manual)
  app.post('/transactions', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const input = transactionSchema.parse(request.body)

      const transaction = await createTransaction(prisma, {
        companyId,
        type: input.type as TransactionType,
        category: input.category,
        amount: input.amount,
        description: input.description,
        refType: TransactionRefType.MANUAL,
        date: input.date ? new Date(input.date) : new Date(),
      })

      return reply.code(201).send({ data: transaction })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // GET /api/finance/accounts-receivable
  app.get('/accounts-receivable', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { status, clientId } = request.query as any

      const accounts = await prisma.accountReceivable.findMany({
        where: {
          companyId,
          ...(status ? { status } : { status: { not: AccountStatus.PAID } }),
          ...(clientId && { clientId }),
        },
        include: {
          client: { select: { id: true, name: true } },
          sale: { select: { id: true, number: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      return reply.send({
        data: accounts.map(a => ({
          ...a,
          amount: Number(a.amount),
          amountPaid: Number(a.amountPaid),
          pending: Number(a.amount) - Number(a.amountPaid),
          clientName: a.client.name,
          saleNumber: a.sale.number,
        })),
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // POST /api/finance/accounts-receivable/:id/pay
  app.post('/accounts-receivable/:id/pay', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any
      const { amount, notes } = payAccountSchema.parse(request.body)

      const account = await prisma.accountReceivable.findFirst({ where: { id, companyId } })
      if (!account) throw new NotFoundError('Cuenta a cobrar')
      if (account.status === 'PAID') throw new AppError('La cuenta ya está pagada')

      const pending = Number(account.amount) - Number(account.amountPaid)
      if (amount > pending) throw new AppError(`El monto excede el saldo pendiente ($${pending})`)

      const newPaid = Number(account.amountPaid) + amount
      const newStatus: AccountStatus = newPaid >= Number(account.amount) ? AccountStatus.PAID : AccountStatus.PARTIAL

      await prisma.$transaction(async (tx) => {
        await tx.accountReceivable.update({
          where: { id },
          data: {
            amountPaid: newPaid,
            status: newStatus,
            paidAt: newStatus === AccountStatus.PAID ? new Date() : null,
          },
        })

        await createTransaction(tx as any, {
          companyId,
          type: TransactionType.INCOME,
          category: 'Cobro de deuda',
          amount,
          description: notes ?? `Pago cuenta a cobrar`,
          refType: TransactionRefType.ACCOUNT_RECEIVABLE,
          refId: id,
        })
      })

      return reply.send({ data: { message: 'Pago registrado', status: newStatus } })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // GET /api/finance/accounts-payable
  app.get('/accounts-payable', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { status, supplierId } = request.query as any

      const accounts = await prisma.accountPayable.findMany({
        where: {
          companyId,
          ...(status ? { status } : { status: { not: AccountStatus.PAID } }),
          ...(supplierId && { supplierId }),
        },
        include: {
          supplier: { select: { id: true, name: true } },
          purchase: { select: { id: true, number: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      return reply.send({
        data: accounts.map(a => ({
          ...a,
          amount: Number(a.amount),
          amountPaid: Number(a.amountPaid),
          pending: Number(a.amount) - Number(a.amountPaid),
          supplierName: a.supplier.name,
          purchaseNumber: a.purchase.number,
        })),
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // POST /api/finance/accounts-payable/:id/pay
  app.post('/accounts-payable/:id/pay', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { id } = request.params as any
      const { amount, notes } = payAccountSchema.parse(request.body)

      const account = await prisma.accountPayable.findFirst({ where: { id, companyId } })
      if (!account) throw new NotFoundError('Cuenta a pagar')
      if (account.status === 'PAID') throw new AppError('La cuenta ya está pagada')

      const pending = Number(account.amount) - Number(account.amountPaid)
      if (amount > pending) throw new AppError(`El monto excede el saldo pendiente ($${pending})`)

      const newPaid = Number(account.amountPaid) + amount
      const newStatus: AccountStatus = newPaid >= Number(account.amount) ? AccountStatus.PAID : AccountStatus.PARTIAL

      await prisma.$transaction(async (tx) => {
        await tx.accountPayable.update({
          where: { id },
          data: {
            amountPaid: newPaid,
            status: newStatus,
            paidAt: newStatus === AccountStatus.PAID ? new Date() : null,
          },
        })

        await createTransaction(tx as any, {
          companyId,
          type: TransactionType.EXPENSE,
          category: 'Pago a proveedor',
          amount,
          description: notes ?? `Pago cuenta a pagar`,
          refType: TransactionRefType.ACCOUNT_PAYABLE,
          refId: id,
        })
      })

      return reply.send({ data: { message: 'Pago registrado', status: newStatus } })
    } catch (err) {
      return handleError(reply, err)
    }
  })
}
