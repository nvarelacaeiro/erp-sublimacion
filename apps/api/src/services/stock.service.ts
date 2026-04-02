import { MovementType, MovementRefType } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../lib/errors'

interface StockItem {
  productId: string | null | undefined
  quantity: number
}

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

/**
 * Descuenta stock por cada item de una venta.
 * Verifica stock suficiente antes de operar.
 */
export async function decreaseStock(
  tx: TxClient,
  companyId: string,
  items: StockItem[],
  refType: MovementRefType,
  refId: string,
) {
  for (const item of items) {
    if (!item.productId) continue

    const product = await tx.product.findFirst({
      where: { id: item.productId, companyId },
      select: { id: true, name: true, stock: true },
    })

    if (!product) continue

    const currentStock = Number(product.stock)
    if (currentStock < item.quantity) {
      throw new AppError(
        `Stock insuficiente para "${product.name}". Disponible: ${currentStock}, requerido: ${item.quantity}`,
        400,
      )
    }

    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } },
    })

    await tx.stockMovement.create({
      data: {
        companyId,
        productId: item.productId,
        type: MovementType.OUT,
        quantity: item.quantity,
        refType,
        refId,
      },
    })
  }
}

/**
 * Suma stock por cada item de una compra.
 */
export async function increaseStock(
  tx: TxClient,
  companyId: string,
  items: StockItem[],
  refType: MovementRefType,
  refId: string,
) {
  for (const item of items) {
    if (!item.productId) continue

    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    })

    await tx.stockMovement.create({
      data: {
        companyId,
        productId: item.productId,
        type: MovementType.IN,
        quantity: item.quantity,
        refType,
        refId,
      },
    })
  }
}
