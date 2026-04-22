import { prisma } from './prisma'
import { AppError } from './errors'

// ── Límites por plan ──────────────────────────────────────────
// -1 = ilimitado
export const PLAN_LIMITS = {
  TRIAL:   { maxUsers: 2,  maxProducts: 50  },
  STARTER: { maxUsers: 5,  maxProducts: 500 },
  PRO:     { maxUsers: -1, maxProducts: -1  },
} as const

// ── Chequea que la empresa esté activa y no suspendida ────────
export async function assertCompanyActive(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { active: true, suspended: true, plan: true, trialEndsAt: true },
  })

  if (!company || !company.active) {
    throw new AppError('Empresa inactiva.', 403)
  }

  // Auto-suspender si el trial venció
  if (company.plan === 'TRIAL' && company.trialEndsAt && company.trialEndsAt < new Date()) {
    await prisma.company.update({ where: { id: companyId }, data: { suspended: true } })
    throw new AppError('El período de prueba ha vencido. Contactá a soporte para continuar.', 403)
  }

  if (company.suspended) {
    throw new AppError('Tu cuenta está suspendida. Contactá a soporte.', 403)
  }
}

// ── Chequea límite de un recurso antes de crear ───────────────
export async function assertPlanLimit(
  companyId: string,
  resource: 'users' | 'products',
) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      plan: true,
      _count: { select: { users: true, products: true } },
    },
  })

  if (!company) throw new AppError('Empresa no encontrada.', 404)

  const limits = PLAN_LIMITS[company.plan as keyof typeof PLAN_LIMITS]
  const maxKey = resource === 'users' ? 'maxUsers' : 'maxProducts'
  const max = limits[maxKey]

  if (max === -1) return // ilimitado

  const current = company._count[resource]
  if (current >= max) {
    const label = resource === 'users' ? 'usuarios' : 'productos'
    throw new AppError(
      `Alcanzaste el límite de ${max} ${label} en tu plan. Actualizá tu plan para agregar más.`,
      403,
    )
  }
}

// ── Info de uso para el panel admin ──────────────────────────
export async function getCompanyUsage(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      plan: true,
      _count: { select: { users: true, products: true } },
    },
  })

  if (!company) return null

  const limits = PLAN_LIMITS[company.plan as keyof typeof PLAN_LIMITS]

  return {
    users:    { current: company._count.users,    max: limits.maxUsers },
    products: { current: company._count.products, max: limits.maxProducts },
  }
}
