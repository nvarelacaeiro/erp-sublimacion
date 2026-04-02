import { prisma } from '../lib/prisma'

type NumberedEntity = 'quotes' | 'sales' | 'purchases'

/**
 * Genera el próximo número correlativo por empresa y entidad.
 * Se ejecuta DENTRO de una transacción Prisma para evitar duplicados.
 */
export async function getNextNumber(
  tx: typeof prisma,
  companyId: string,
  entity: NumberedEntity,
): Promise<number> {
  let max: { _max: { number: number | null } }

  if (entity === 'quotes') {
    max = await tx.quote.aggregate({ where: { companyId }, _max: { number: true } })
  } else if (entity === 'sales') {
    max = await tx.sale.aggregate({ where: { companyId }, _max: { number: true } })
  } else {
    max = await tx.purchase.aggregate({ where: { companyId }, _max: { number: true } })
  }

  return (max._max.number ?? 0) + 1
}
