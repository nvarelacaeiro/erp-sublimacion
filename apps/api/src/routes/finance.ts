import { FastifyInstance } from 'fastify'
import { transactionSchema, payAccountSchema } from '../shared'
import { TransactionType, TransactionRefType, AccountStatus } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { handleError, NotFoundError, AppError } from '../lib/errors'
import { createTransaction } from '../services/finance.service'

export async function financeRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // GET /api/finance/analytics
  app.get('/analytics', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { from, to, granularity = 'month' } = request.query as any

      const dateFilter = {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
      }
      const hasDateFilter = from || to

      // ── Summary from transactions ──────────────────────────────────────
      const transactions = await prisma.transaction.findMany({
        where: {
          companyId,
          ...(hasDateFilter && { date: dateFilter }),
        },
        select: { type: true, amount: true, date: true, category: true, refType: true },
      })

      const totalIncome = transactions
        .filter(t => t.type === 'INCOME')
        .reduce((s, t) => s + Number(t.amount), 0)
      const totalExpenses = transactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((s, t) => s + Number(t.amount), 0)
      const netProfit = totalIncome - totalExpenses
      const netMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0

      // ── Sales for avg ticket + top products + top clients ─────────────
      const sales = await prisma.sale.findMany({
        where: {
          companyId,
          status: { not: 'CANCELLED' },
          ...(hasDateFilter && { date: dateFilter }),
        },
        include: {
          client: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, cost: true } } } },
        },
      })

      const avgTicket = sales.length > 0
        ? sales.reduce((s, sale) => s + Number(sale.total), 0) / sales.length
        : 0

      // ── Time-series ────────────────────────────────────────────────────
      function getPeriodKey(date: Date): string {
        const d = new Date(date)
        if (granularity === 'day') return d.toISOString().slice(0, 10)
        if (granularity === 'week') {
          // ISO week: Monday-based
          const tmp = new Date(d)
          tmp.setUTCHours(0, 0, 0, 0)
          tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7))
          const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
          const weekNum = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
          return `${tmp.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
        }
        if (granularity === 'year') return String(d.getFullYear())
        // default: month
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      }

      const seriesMap: Record<string, { income: number; expense: number; profit: number }> = {}
      for (const t of transactions) {
        const key = getPeriodKey(new Date(t.date))
        if (!seriesMap[key]) seriesMap[key] = { income: 0, expense: 0, profit: 0 }
        if (t.type === 'INCOME') seriesMap[key].income += Number(t.amount)
        else seriesMap[key].expense += Number(t.amount)
      }
      const timeSeries = Object.entries(seriesMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, values]) => ({
          period,
          income: values.income,
          expense: values.expense,
          profit: values.income - values.expense,
        }))

      // ── Top products ───────────────────────────────────────────────────
      const productMap: Record<string, { name: string; qty: number; revenue: number; cost: number }> = {}
      for (const sale of sales) {
        for (const item of sale.items) {
          const key = item.productId ?? item.description
          const name = item.product?.name ?? item.description
          if (!productMap[key]) productMap[key] = { name, qty: 0, revenue: 0, cost: 0 }
          productMap[key].qty += Number(item.quantity)
          productMap[key].revenue += Number(item.total)
          productMap[key].cost += Number(item.unitCost) * Number(item.quantity)
        }
      }
      const topProducts = Object.values(productMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map(p => ({ ...p, profit: p.revenue - p.cost }))

      // ── Top clients ────────────────────────────────────────────────────
      const clientMap: Record<string, { name: string; count: number; total: number }> = {}
      for (const sale of sales) {
        const key = sale.clientId ?? 'anonymous'
        const name = sale.client?.name ?? 'Sin cliente'
        if (!clientMap[key]) clientMap[key] = { name, count: 0, total: 0 }
        clientMap[key].count++
        clientMap[key].total += Number(sale.total)
      }
      const topClients = Object.values(clientMap)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)

      // ── Expense breakdown by refType ───────────────────────────────────
      const expenseByCategory: Record<string, number> = {}
      for (const t of transactions.filter(t => t.type === 'EXPENSE')) {
        const key = t.refType === 'SALE' ? 'Ventas'
          : t.refType === 'PURCHASE' ? 'Compras a proveedores'
          : t.refType === 'ACCOUNT_PAYABLE' ? 'Cuentas a pagar'
          : 'Manual / Otros'
        expenseByCategory[key] = (expenseByCategory[key] ?? 0) + Number(t.amount)
      }
      const expenseBreakdown = Object.entries(expenseByCategory)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

      return reply.send({
        data: {
          summary: { totalIncome, totalExpenses, netProfit, netMargin, avgTicket, salesCount: sales.length },
          timeSeries,
          topProducts,
          topClients,
          expenseBreakdown,
        },
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })

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
