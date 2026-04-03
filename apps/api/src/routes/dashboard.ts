import { FastifyInstance } from 'fastify'
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, subDays, subYears } from 'date-fns'
import { prisma } from '../lib/prisma'
import { handleError } from '../lib/errors'

function getDateRange(range: string, from?: string, to?: string): { start: Date; end: Date } {
  const now = new Date()
  switch (range) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) }
    case 'week':
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) }
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) }
    case '3months':
      return { start: startOfDay(subMonths(now, 3)), end: endOfDay(now) }
    case 'year':
      return { start: startOfDay(subYears(now, 1)), end: endOfDay(now) }
    case 'custom':
      return {
        start: from ? startOfDay(new Date(from)) : startOfMonth(now),
        end: to ? endOfDay(new Date(to)) : endOfDay(now),
      }
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) }
  }
}

export async function dashboardRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // GET /api/dashboard?range=month|today|week|3months|year|custom&from=&to=
  app.get('/', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const { range = 'month', from, to } = request.query as any

      const { start, end } = getDateRange(range, from, to)
      const useDaily = range === 'today' || range === 'week'

      const [
        salesAgg,
        incomeAgg,
        expenseAgg,
        totalReceivable,
        totalPayable,
        lowStockProducts,
        recentSales,
        chartData,
      ] = await Promise.all([
        prisma.sale.aggregate({
          where: { companyId, status: { not: 'CANCELLED' }, date: { gte: start, lte: end } },
          _sum: { total: true },
          _count: { id: true },
        }),

        prisma.transaction.aggregate({
          where: { companyId, type: 'INCOME', date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),

        prisma.transaction.aggregate({
          where: { companyId, type: 'EXPENSE', date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),

        prisma.accountReceivable.aggregate({
          where: { companyId, status: { not: 'PAID' } },
          _sum: { amount: true, amountPaid: true },
        }),

        prisma.accountPayable.aggregate({
          where: { companyId, status: { not: 'PAID' } },
          _sum: { amount: true, amountPaid: true },
        }),

        prisma.product.findMany({
          where: { companyId, active: true },
          select: { id: true, name: true, sku: true, stock: true, minStock: true },
        }).then(products => products.filter(p => Number(p.stock) <= Number(p.minStock))),

        prisma.sale.findMany({
          where: { companyId, status: { not: 'CANCELLED' }, date: { gte: start, lte: end } },
          include: { client: { select: { name: true } } },
          orderBy: { date: 'desc' },
          take: 5,
        }),

        useDaily
          ? prisma.$queryRaw<Array<{ period: string; income: number; expense: number }>>`
              SELECT
                TO_CHAR(date, 'DD/MM') as period,
                SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as expense
              FROM transactions
              WHERE company_id = ${companyId}
                AND date >= ${start} AND date <= ${end}
              GROUP BY TO_CHAR(date, 'DD/MM'), DATE_TRUNC('day', date)
              ORDER BY DATE_TRUNC('day', date) ASC
            `
          : prisma.$queryRaw<Array<{ period: string; income: number; expense: number }>>`
              SELECT
                TO_CHAR(date, 'YYYY-MM') as period,
                SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as expense
              FROM transactions
              WHERE company_id = ${companyId}
                AND date >= ${start} AND date <= ${end}
              GROUP BY TO_CHAR(date, 'YYYY-MM')
              ORDER BY period ASC
            `,
      ])

      const income = Number(incomeAgg._sum.amount ?? 0)
      const expense = Number(expenseAgg._sum.amount ?? 0)

      return reply.send({
        data: {
          range,
          periodStart: start,
          periodEnd: end,
          salesThisMonth: Number(salesAgg._sum.total ?? 0),
          salesCount: salesAgg._count.id,
          totalIncome: income,
          totalExpense: expense,
          estimatedProfit: income - expense,
          totalReceivable:
            Number(totalReceivable._sum.amount ?? 0) - Number(totalReceivable._sum.amountPaid ?? 0),
          totalPayable:
            Number(totalPayable._sum.amount ?? 0) - Number(totalPayable._sum.amountPaid ?? 0),
          lowStockProducts: lowStockProducts.map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            stock: Number(p.stock),
            minStock: Number(p.minStock),
          })),
          recentSales: recentSales.map(s => ({
            id: s.id,
            number: s.number,
            clientName: s.client?.name ?? 'Sin cliente',
            total: Number(s.total),
            date: s.date,
            paymentMethod: s.paymentMethod,
          })),
          chart: chartData.map(row => ({
            month: row.period,
            income: Number(row.income),
            expense: Number(row.expense),
          })),
        },
      })
    } catch (err) {
      return handleError(reply, err)
    }
  })
}
