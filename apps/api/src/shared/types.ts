// ============================================================
// Tipos base del dominio
// ============================================================

export type UserRole = 'ADMIN' | 'SELLER' | 'APPROVER' | 'REQUESTER'
export type RequisitionStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ORDERED' | 'CLOSED'
export type RequisitionPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
export type QuoteStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
export type SaleStatus = 'COMPLETED' | 'PENDING' | 'CANCELLED'
export type PurchaseStatus = 'PENDING' | 'RECEIVED' | 'CANCELLED'
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CARD' | 'MERCADOPAGO' | 'CREDIT' | 'OTHER'
export type AccountStatus = 'PENDING' | 'PARTIAL' | 'PAID'
export type TransactionType = 'INCOME' | 'EXPENSE'
export type MovementType = 'IN' | 'OUT'

// ── Auth ─────────────────────────────────────────────────────
export interface AuthUser {
  id: string
  companyId: string
  name: string
  email: string
  role: UserRole
}

export interface LoginResponse {
  user: AuthUser
  accessToken: string
}

// ── Dashboard ─────────────────────────────────────────────────
export interface DashboardStats {
  salesThisMonth: number
  salesCount: number
  totalIncome: number
  totalExpense: number
  estimatedProfit: number
  totalReceivable: number
  totalPayable: number
  lowStockProducts: LowStockProduct[]
}

export interface LowStockProduct {
  id: string
  name: string
  sku: string | null
  stock: number
  minStock: number
}

// ── Productos ─────────────────────────────────────────────────
export interface Product {
  id: string
  categoryId: string | null
  categoryName: string | null
  name: string
  sku: string | null
  description: string | null
  cost: number
  price: number
  stock: number
  minStock: number
  unit: string
  active: boolean
  createdAt: string
}

// ── Clientes ──────────────────────────────────────────────────
export interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  taxId: string | null
  notes: string | null
  active: boolean
  totalDebt: number
  createdAt: string
}

// ── Items de presupuesto / venta ──────────────────────────────
export interface LineItem {
  productId: string | null
  description: string
  quantity: number
  unitPrice: number
  total: number
}

// ── Presupuesto ───────────────────────────────────────────────
export interface Quote {
  id: string
  number: number
  clientId: string | null
  clientName: string | null
  userId: string
  userName: string
  date: string
  validUntil: string | null
  status: QuoteStatus
  subtotal: number
  discount: number
  total: number
  notes: string | null
  items: LineItem[]
  createdAt: string
}

// ── Venta ─────────────────────────────────────────────────────
export interface Sale {
  id: string
  number: number
  clientId: string | null
  clientName: string | null
  userId: string
  userName: string
  quoteId: string | null
  date: string
  status: SaleStatus
  paymentMethod: PaymentMethod
  subtotal: number
  discount: number
  total: number
  notes: string | null
  items: LineItem[]
  createdAt: string
}

// ── Compra ────────────────────────────────────────────────────
export interface Purchase {
  id: string
  number: number
  supplierId: string | null
  supplierName: string | null
  userId: string
  date: string
  status: PurchaseStatus
  subtotal: number
  total: number
  notes: string | null
  items: Array<LineItem & { unitCost: number }>
  createdAt: string
}

// ── Respuestas API genéricas ──────────────────────────────────
export interface ApiResponse<T> {
  data: T
}

export interface ApiError {
  error: string
  message: string
  statusCode: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
