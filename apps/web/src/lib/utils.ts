import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy', { locale: es })
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: es })
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  MERCADOPAGO: 'MercadoPago',
  CREDIT: 'Cuenta corriente',
  OTHER: 'Otro',
}

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  EXPIRED: 'Vencido',
}

export const QUOTE_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-600',
}

export const SALE_STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Completada',
  PENDING: 'Pendiente',
  CANCELLED: 'Cancelada',
}

export const SALE_STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-800',
  PENDING: 'bg-amber-100 text-amber-800',
  CANCELLED: 'bg-red-100 text-red-800',
}
