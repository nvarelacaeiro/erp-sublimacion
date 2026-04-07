import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import cron from 'node-cron'

import { authRoutes } from './routes/auth'
import { productRoutes } from './routes/products'
import { categoryRoutes } from './routes/categories'
import { clientRoutes } from './routes/clients'
import { supplierRoutes } from './routes/suppliers'
import { quoteRoutes } from './routes/quotes'
import { saleRoutes } from './routes/sales'
import { purchaseRoutes } from './routes/purchases'
import { financeRoutes } from './routes/finance'
import { dashboardRoutes } from './routes/dashboard'
import { userRoutes } from './routes/users'
import { productItemRoutes } from './routes/product-items'
import { runStockAlertCheck } from './services/stock-alert.service'

const app = Fastify({ logger: process.env.NODE_ENV !== 'production' })

// ── Plugins ──────────────────────────────────────────────────
app.register(cors, {
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
})

app.register(cookie)

app.register(jwt, {
  secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  cookie: { cookieName: 'token', signed: false },
})

// ── Decorator: autenticar request ────────────────────────────
app.decorate('authenticate', async function (request: any, reply: any) {
  try {
    await request.jwtVerify()
  } catch {
    reply.code(401).send({ error: 'Unauthorized', message: 'Token inválido o expirado', statusCode: 401 })
  }
})

// ── Rutas ────────────────────────────────────────────────────
app.register(authRoutes, { prefix: '/api/auth' })
app.register(productRoutes, { prefix: '/api/products' })
app.register(categoryRoutes, { prefix: '/api/categories' })
app.register(clientRoutes, { prefix: '/api/clients' })
app.register(supplierRoutes, { prefix: '/api/suppliers' })
app.register(quoteRoutes, { prefix: '/api/quotes' })
app.register(saleRoutes, { prefix: '/api/sales' })
app.register(purchaseRoutes, { prefix: '/api/purchases' })
app.register(financeRoutes, { prefix: '/api/finance' })
app.register(dashboardRoutes, { prefix: '/api/dashboard' })
app.register(userRoutes, { prefix: '/api/users' })
app.register(productItemRoutes, { prefix: '/api/products' })

// ── Health check ─────────────────────────────────────────────
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

// ── Manual stock alert trigger (for testing / admin use) ─────
app.post('/api/internal/stock-alert-check', async (request, reply) => {
  const secret = process.env.INTERNAL_SECRET
  const { authorization } = request.headers as any
  if (secret && authorization !== `Bearer ${secret}`) {
    return reply.code(401).send({ error: 'Unauthorized' })
  }
  await runStockAlertCheck()
  return reply.send({ data: { message: 'Stock alert check triggered' } })
})

// ── Start ────────────────────────────────────────────────────
const start = async () => {
  try {
    const port = Number(process.env.PORT ?? 3001)
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`🚀 API corriendo en http://localhost:${port}`)

    // ── Cron: stock alert check every hour ───────────────────
    cron.schedule('0 * * * *', () => {
      runStockAlertCheck()
    })
    console.log('⏰ Stock alert cron scheduled (every hour)')

    // Run once on startup to catch any pre-existing low-stock products
    runStockAlertCheck()
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
