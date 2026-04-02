import { TransactionType, TransactionRefType, AccountStatus } from '@prisma/client'
import { prisma } from '../lib/prisma'

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

/**
 * Registra una transacción financiera automáticamente.
 */
export async function createTransaction(
  tx: TxClient,
  data: {
    companyId: string
    type: TransactionType
    category: string
    amount: number
    description: string
    refType: TransactionRefType
    refId?: string
    saleId?: string
    purchaseId?: string
    date?: Date
  },
) {
  return tx.transaction.create({
    data: {
      companyId: data.companyId,
      type: data.type,
      category: data.category,
      amount: data.amount,
      description: data.description,
      refType: data.refType,
      refId: data.refId,
      saleId: data.saleId,
      purchaseId: data.purchaseId,
      date: data.date ?? new Date(),
    },
  })
}

/**
 * Crea una cuenta a cobrar cuando el método de pago es CREDIT.
 */
export async function createAccountReceivable(
  tx: TxClient,
  data: {
    companyId: string
    clientId: string
    saleId: string
    amount: number
  },
) {
  return tx.accountReceivable.create({
    data: {
      companyId: data.companyId,
      clientId: data.clientId,
      saleId: data.saleId,
      amount: data.amount,
      status: AccountStatus.PENDING,
    },
  })
}

/**
 * Crea una cuenta a pagar cuando se registra una compra.
 */
export async function createAccountPayable(
  tx: TxClient,
  data: {
    companyId: string
    supplierId: string
    purchaseId: string
    amount: number
    dueDate?: Date
  },
) {
  return tx.accountPayable.create({
    data: {
      companyId: data.companyId,
      supplierId: data.supplierId,
      purchaseId: data.purchaseId,
      amount: data.amount,
      status: AccountStatus.PENDING,
      dueDate: data.dueDate,
    },
  })
}
