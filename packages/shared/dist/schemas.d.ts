import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const productSchema: z.ZodObject<{
    categoryId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    name: z.ZodString;
    sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    cost: z.ZodNumber;
    price: z.ZodNumber;
    stock: z.ZodDefault<z.ZodNumber>;
    minStock: z.ZodDefault<z.ZodNumber>;
    unit: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    cost: number;
    price: number;
    stock: number;
    minStock: number;
    unit: string;
    categoryId?: string | null | undefined;
    sku?: string | null | undefined;
    description?: string | null | undefined;
}, {
    name: string;
    cost: number;
    price: number;
    categoryId?: string | null | undefined;
    sku?: string | null | undefined;
    description?: string | null | undefined;
    stock?: number | undefined;
    minStock?: number | undefined;
    unit?: string | undefined;
}>;
export declare const clientSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    taxId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    email?: string | null | undefined;
    phone?: string | null | undefined;
    address?: string | null | undefined;
    taxId?: string | null | undefined;
    notes?: string | null | undefined;
}, {
    name: string;
    email?: string | null | undefined;
    phone?: string | null | undefined;
    address?: string | null | undefined;
    taxId?: string | null | undefined;
    notes?: string | null | undefined;
}>;
export declare const supplierSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    taxId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    email?: string | null | undefined;
    phone?: string | null | undefined;
    address?: string | null | undefined;
    taxId?: string | null | undefined;
    notes?: string | null | undefined;
}, {
    name: string;
    email?: string | null | undefined;
    phone?: string | null | undefined;
    address?: string | null | undefined;
    taxId?: string | null | undefined;
    notes?: string | null | undefined;
}>;
export declare const lineItemSchema: z.ZodObject<{
    productId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodString;
    quantity: z.ZodNumber;
    unitPrice: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    description: string;
    quantity: number;
    unitPrice: number;
    productId?: string | null | undefined;
}, {
    description: string;
    quantity: number;
    unitPrice: number;
    productId?: string | null | undefined;
}>;
export declare const quoteSchema: z.ZodObject<{
    clientId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    validUntil: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    discount: z.ZodDefault<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    items: z.ZodArray<z.ZodObject<{
        productId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        description: z.ZodString;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        description: string;
        quantity: number;
        unitPrice: number;
        productId?: string | null | undefined;
    }, {
        description: string;
        quantity: number;
        unitPrice: number;
        productId?: string | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    discount: number;
    items: {
        description: string;
        quantity: number;
        unitPrice: number;
        productId?: string | null | undefined;
    }[];
    notes?: string | null | undefined;
    clientId?: string | null | undefined;
    validUntil?: string | null | undefined;
}, {
    items: {
        description: string;
        quantity: number;
        unitPrice: number;
        productId?: string | null | undefined;
    }[];
    notes?: string | null | undefined;
    clientId?: string | null | undefined;
    validUntil?: string | null | undefined;
    discount?: number | undefined;
}>;
export declare const saleSchema: z.ZodObject<{
    clientId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    quoteId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    date: z.ZodOptional<z.ZodString>;
    paymentMethod: z.ZodEnum<["CASH", "TRANSFER", "CARD", "MERCADOPAGO", "CREDIT", "OTHER"]>;
    discount: z.ZodDefault<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    items: z.ZodArray<z.ZodObject<{
        productId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        description: z.ZodString;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        description: string;
        quantity: number;
        unitPrice: number;
        productId?: string | null | undefined;
    }, {
        description: string;
        quantity: number;
        unitPrice: number;
        productId?: string | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    discount: number;
    items: {
        description: string;
        quantity: number;
        unitPrice: number;
        productId?: string | null | undefined;
    }[];
    paymentMethod: "CASH" | "TRANSFER" | "CARD" | "MERCADOPAGO" | "CREDIT" | "OTHER";
    notes?: string | null | undefined;
    clientId?: string | null | undefined;
    quoteId?: string | null | undefined;
    date?: string | undefined;
}, {
    items: {
        description: string;
        quantity: number;
        unitPrice: number;
        productId?: string | null | undefined;
    }[];
    paymentMethod: "CASH" | "TRANSFER" | "CARD" | "MERCADOPAGO" | "CREDIT" | "OTHER";
    notes?: string | null | undefined;
    clientId?: string | null | undefined;
    discount?: number | undefined;
    quoteId?: string | null | undefined;
    date?: string | undefined;
}>;
export declare const purchaseItemSchema: z.ZodObject<{
    productId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodString;
    quantity: z.ZodNumber;
    unitCost: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    description: string;
    quantity: number;
    unitCost: number;
    productId?: string | null | undefined;
}, {
    description: string;
    quantity: number;
    unitCost: number;
    productId?: string | null | undefined;
}>;
export declare const purchaseSchema: z.ZodObject<{
    supplierId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    date: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    items: z.ZodArray<z.ZodObject<{
        productId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        description: z.ZodString;
        quantity: z.ZodNumber;
        unitCost: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        description: string;
        quantity: number;
        unitCost: number;
        productId?: string | null | undefined;
    }, {
        description: string;
        quantity: number;
        unitCost: number;
        productId?: string | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    items: {
        description: string;
        quantity: number;
        unitCost: number;
        productId?: string | null | undefined;
    }[];
    notes?: string | null | undefined;
    date?: string | undefined;
    supplierId?: string | null | undefined;
}, {
    items: {
        description: string;
        quantity: number;
        unitCost: number;
        productId?: string | null | undefined;
    }[];
    notes?: string | null | undefined;
    date?: string | undefined;
    supplierId?: string | null | undefined;
}>;
export declare const stockAdjustmentSchema: z.ZodObject<{
    quantity: z.ZodEffects<z.ZodNumber, number, number>;
    notes: z.ZodString;
}, "strip", z.ZodTypeAny, {
    notes: string;
    quantity: number;
}, {
    notes: string;
    quantity: number;
}>;
export declare const transactionSchema: z.ZodObject<{
    type: z.ZodEnum<["INCOME", "EXPENSE"]>;
    category: z.ZodString;
    amount: z.ZodNumber;
    date: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "INCOME" | "EXPENSE";
    description: string;
    category: string;
    amount: number;
    date?: string | undefined;
}, {
    type: "INCOME" | "EXPENSE";
    description: string;
    category: string;
    amount: number;
    date?: string | undefined;
}>;
export declare const payAccountSchema: z.ZodObject<{
    amount: z.ZodNumber;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    notes?: string | null | undefined;
}, {
    amount: number;
    notes?: string | null | undefined;
}>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ClientInput = z.infer<typeof clientSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type PurchaseInput = z.infer<typeof purchaseSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type PayAccountInput = z.infer<typeof payAccountSchema>;
//# sourceMappingURL=schemas.d.ts.map