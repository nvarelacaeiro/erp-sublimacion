"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payAccountSchema = exports.transactionSchema = exports.stockAdjustmentSchema = exports.purchaseSchema = exports.purchaseItemSchema = exports.saleSchema = exports.quoteSchema = exports.lineItemSchema = exports.supplierSchema = exports.clientSchema = exports.productSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
// ── Auth ──────────────────────────────────────────────────────
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email inválido'),
    password: zod_1.z.string().min(6, 'Mínimo 6 caracteres'),
});
// ── Producto ──────────────────────────────────────────────────
exports.productSchema = zod_1.z.object({
    categoryId: zod_1.z.string().cuid().nullable().optional(),
    name: zod_1.z.string().min(1, 'El nombre es requerido').max(100),
    sku: zod_1.z.string().max(50).nullable().optional(),
    description: zod_1.z.string().max(500).nullable().optional(),
    cost: zod_1.z.number().min(0, 'El costo no puede ser negativo'),
    price: zod_1.z.number().min(0, 'El precio no puede ser negativo'),
    stock: zod_1.z.number().min(0).default(0),
    minStock: zod_1.z.number().min(0).default(0),
    unit: zod_1.z.string().max(20).default('un'),
});
// ── Cliente ───────────────────────────────────────────────────
exports.clientSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'El nombre es requerido').max(100),
    email: zod_1.z.string().email().nullable().optional(),
    phone: zod_1.z.string().max(30).nullable().optional(),
    address: zod_1.z.string().max(200).nullable().optional(),
    taxId: zod_1.z.string().max(30).nullable().optional(),
    notes: zod_1.z.string().max(500).nullable().optional(),
});
// ── Proveedor ─────────────────────────────────────────────────
exports.supplierSchema = exports.clientSchema; // misma estructura
// ── Items de línea ────────────────────────────────────────────
exports.lineItemSchema = zod_1.z.object({
    productId: zod_1.z.string().cuid().nullable().optional(),
    description: zod_1.z.string().min(1, 'La descripción es requerida'),
    quantity: zod_1.z.number().positive('La cantidad debe ser mayor a 0'),
    unitPrice: zod_1.z.number().min(0),
});
// ── Presupuesto ───────────────────────────────────────────────
exports.quoteSchema = zod_1.z.object({
    clientId: zod_1.z.string().cuid().nullable().optional(),
    validUntil: zod_1.z.string().datetime().nullable().optional(),
    discount: zod_1.z.number().min(0).max(100).default(0),
    notes: zod_1.z.string().max(500).nullable().optional(),
    items: zod_1.z.array(exports.lineItemSchema).min(1, 'El presupuesto debe tener al menos un item'),
});
// ── Venta ─────────────────────────────────────────────────────
exports.saleSchema = zod_1.z.object({
    clientId: zod_1.z.string().cuid().nullable().optional(),
    quoteId: zod_1.z.string().cuid().nullable().optional(),
    date: zod_1.z.string().datetime().optional(),
    paymentMethod: zod_1.z.enum(['CASH', 'TRANSFER', 'CARD', 'MERCADOPAGO', 'CREDIT', 'OTHER']),
    discount: zod_1.z.number().min(0).max(100).default(0),
    notes: zod_1.z.string().max(500).nullable().optional(),
    items: zod_1.z.array(exports.lineItemSchema).min(1, 'La venta debe tener al menos un item'),
});
// ── Compra ────────────────────────────────────────────────────
exports.purchaseItemSchema = zod_1.z.object({
    productId: zod_1.z.string().cuid().nullable().optional(),
    description: zod_1.z.string().min(1),
    quantity: zod_1.z.number().positive(),
    unitCost: zod_1.z.number().min(0),
});
exports.purchaseSchema = zod_1.z.object({
    supplierId: zod_1.z.string().cuid().nullable().optional(),
    date: zod_1.z.string().datetime().optional(),
    notes: zod_1.z.string().max(500).nullable().optional(),
    items: zod_1.z.array(exports.purchaseItemSchema).min(1),
});
// ── Ajuste de stock ───────────────────────────────────────────
exports.stockAdjustmentSchema = zod_1.z.object({
    quantity: zod_1.z.number().refine(n => n !== 0, 'La cantidad no puede ser 0'),
    notes: zod_1.z.string().min(1, 'Indicá el motivo del ajuste'),
});
// ── Transacción manual ────────────────────────────────────────
exports.transactionSchema = zod_1.z.object({
    type: zod_1.z.enum(['INCOME', 'EXPENSE']),
    category: zod_1.z.string().min(1),
    amount: zod_1.z.number().positive(),
    date: zod_1.z.string().datetime().optional(),
    description: zod_1.z.string().min(1),
});
// ── Pago de cuenta ────────────────────────────────────────────
exports.payAccountSchema = zod_1.z.object({
    amount: zod_1.z.number().positive('El monto debe ser positivo'),
    notes: zod_1.z.string().max(500).nullable().optional(),
});
