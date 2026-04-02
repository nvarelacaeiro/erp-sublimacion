import { FastifyInstance } from 'fastify'
import { startOfMonth, endOfMonth } from 'date-fns'
import { prisma } from '../lib/prisma'
import { handleError } from '../lib/errors'

export async function dashboardRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // GET /api/dashboard
  app.get('/', authenticate, async (request, reply) => {
    try {
      const { companyId } = request.user as any
      const now = new Date()
      const monthStart = startOfMonth(now)
      const monthEnd = endOfMonth(now)

      const [
        salesThisMonth,
        incomeThisMonth,
        expenseThisMonth,
        totalReceivable,
        totalPayable,
        lowStockProducts,
        recentSales,
        chartData,
      ] = await Promise.all([
        // Ventas del mes (count + total)
        prisma.sale.aggregate({
          where: { companyId, status: { not: 'CANCELLED' }, date: { gte: monthStart, lte: monthEnd } },
          _sum: { total: true },
          _count: { id: true },
        }),

        // Ingresos del mes
        prisma.transaction.aggregate({
          where: { companyId, type: 'INCOME', date: { gte: monthStart, lte: monthEnd } },
          _sum: { amount: true },
        }),

        // Egresos del mes
        prisma.transaction.aggregate({
          where: { companyId, type: 'EXPENSE', date: { gte: monthStart, lte: monthEnd } },
          _sum: { amount: true },
        }),

        // Total a cobrar
        prisma.accountReceivable.aggregate({
          where: { companyId, status: { not: 'PAID' } },
          _sum: { amount: true, amountPaid: true },
        }),

        // Total a pagar
        prisma.accountPayable.aggregate({
          where: { companyId, status: { not: 'PAID' } },
          _sum: { amount: true, amountPaid: true },
        }),

        // Productos con stock bajo
        prisma.product.findMany({
          where: { companyId, active: true },
          select: { id: true, name: true, sku: true, stock: true, minStock: true },
        }).then(products => products.filter(p => Number(p.stock) <= Number(p.minStock))),

        // Últimas 5 ventas
        prisma.sale.findMany({
          where: { companyId, status: { not: 'CANCELLED' } },
          include: { client: { select: { name: true } } },
          orderBy: { date: 'desc' },
          take: 5,
        }),

        // Últimos 6 meses (para gráfico)
        prisma.$queryRaw<Array<{ month: string; income: number; expense: number }>>`
          SELECT
            TO_CHAR(date, 'YYYY-MM') as month,
            SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as expense
          FROM transactions
          WHERE company_id = ${companyId}
            AND date >= NOW() - INTERVAL '6 months'
          GROUP BY TO_CHAR(date, 'YYYY-MM')
          ORDER BY month ASC
        `,
      ])

      const income = Number(incomeThisMonth._sum.amount ?? 0)
      const expense = Number(expenseThisMonth._sum.amount ?? 0)

      return reply.send({
        data: {
          salesThisMonth: Number(salesThisMonth._sum.total ?? 0),
          salesCount: salesThisMonth._count.id,
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
            month: row.month,
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
