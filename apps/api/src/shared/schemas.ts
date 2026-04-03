import { z } from 'zod'

// ID opcional: acepta cuid válido, null, undefined o string vacío (→ null)
const optionalId = z.preprocess(
  (v) => (v === '' ? null : v),
  z.string().min(1).nullable().optional(),
)

// ── Auth ──────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

// ── Producto ──────────────────────────────────────────────────
export const productSchema = z.object({
  categoryId: optionalId,
  name: z.string().min(1, 'El nombre es requerido').max(100),
  sku: z.string().max(50).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  cost: z.number().min(0, 'El costo no puede ser negativo'),
  price: z.number().min(0, 'El precio no puede ser negativo'),
  stock: z.number().min(0).default(0),
  minStock: z.number().min(0).default(0),
  unit: z.string().max(20).default('un'),
})

// ── Cliente ───────────────────────────────────────────────────
export const clientSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().max(200).nullable().optional(),
  taxId: z.string().max(30).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})

// ── Proveedor ─────────────────────────────────────────────────
export const supplierSchema = clientSchema // misma estructura

// ── Items de línea ────────────────────────────────────────────
export const lineItemSchema = z.object({
  productId: optionalId,
  description: z.string().min(1, 'La descripción es requerida'),
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  unitPrice: z.number().min(0),
})

// ── Presupuesto ───────────────────────────────────────────────
export const quoteSchema = z.object({
  clientId: optionalId,
  validUntil: z.string().datetime().nullable().optional(),
  discount: z.number().min(0).max(100).default(0),
  notes: z.string().max(500).nullable().optional(),
  items: z.array(lineItemSchema).min(1, 'El presupuesto debe tener al menos un item'),
})

// ── Venta ─────────────────────────────────────────────────────
export const saleSchema = z.object({
  clientId: optionalId,
  quoteId: optionalId,
  date: z.string().datetime().optional(),
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'CARD', 'MERCADOPAGO', 'CREDIT', 'OTHER']),
  discount: z.number().min(0).max(100).default(0),
  notes: z.string().max(500).nullable().optional(),
  items: z.array(lineItemSchema).min(1, 'La venta debe tener al menos un item'),
})

// ── Compra ────────────────────────────────────────────────────
export const purchaseItemSchema = z.object({
  productId: optionalId,
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitCost: z.number().min(0),
})

export const purchaseSchema = z.object({
  supplierId: optionalId,
  date: z.string().datetime().optional(),
  notes: z.string().max(500).nullable().optional(),
  items: z.array(purchaseItemSchema).min(1),
})

// ── Ajuste de stock ───────────────────────────────────────────
export const stockAdjustmentSchema = z.object({
  quantity: z.number().refine(n => n !== 0, 'La cantidad no puede ser 0'),
  notes: z.string().min(1, 'Indicá el motivo del ajuste'),
})

// ── Transacción manual ────────────────────────────────────────
export const transactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().datetime().optional(),
  description: z.string().min(1),
})

// ── Pago de cuenta ────────────────────────────────────────────
export const payAccountSchema = z.object({
  amount: z.number().positive('El monto debe ser positivo'),
  notes: z.string().max(500).nullable().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type ProductInput = z.infer<typeof productSchema>
export type ClientInput = z.infer<typeof clientSchema>
export type SupplierInput = z.infer<typeof supplierSchema>
export type QuoteInput = z.infer<typeof quoteSchema>
export type SaleInput = z.infer<typeof saleSchema>
export type PurchaseInput = z.infer<typeof purchaseSchema>
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>
export type TransactionInput = z.infer<typeof transactionSchema>
export type PayAccountInput = z.infer<typeof payAccountSchema>
