'use client'
import { useState } from 'react'
import { useQuotes, useConvertQuote, useUpdateQuoteStatus, useDeleteQuote } from '@/hooks/useQuotes'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from '@/lib/utils'
import { openQuotePrintWindow, buildWhatsAppText } from '@/lib/quotePrint'
import { FileText, CheckCircle, XCircle, Trash2, Download, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/shared/Badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'

const PAYMENT_OPTIONS = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'MERCADOPAGO', label: 'MercadoPago' },
  { value: 'CREDIT', label: 'Cuenta corriente' },
]

export default function QuotesPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [convertId, setConvertId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [convertError, setConvertError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: quotes = [], isLoading } = useQuotes({ status: statusFilter || undefined })
  const convertQuote = useConvertQuote()
  const updateStatus = useUpdateQuoteStatus()
  const deleteQuote = useDeleteQuote()

  async function handleConvert() {
    if (!convertId) return
    setConvertError('')
    try {
      await convertQuote.mutateAsync({ id: convertId, paymentMethod })
      setConvertId(null)
    } catch (err: any) {
      setConvertError(err?.message ?? 'Error al confirmar la venta')
    }
  }

  async function handleReject(id: string) {
    if (!confirm('¿Marcar como rechazado?')) return
    await updateStatus.mutateAsync({ id, status: 'REJECTED' })
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar presupuesto?')) return
    await deleteQuote.mutateAsync(id)
  }

  function handleDownloadPDF(quote: any) {
    openQuotePrintWindow(quote)
  }

  function handleWhatsApp(quote: any) {
    const text = buildWhatsAppText(quote)
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Filtros + acción */}
      <div className="flex gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">Todos</option>
          <option value="PENDING">Pendientes</option>
          <option value="APPROVED">Aprobados</option>
          <option value="REJECTED">Rechazados</option>
        </select>
        <div className="flex-1" />
        <Link href="/quotes/new">
          <Button>Nuevo</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-xl border animate-pulse" />
          ))}
        </div>
      ) : quotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin presupuestos"
          description="Creá tu primer presupuesto."
          action={<Link href="/quotes/new"><Button>Nuevo presupuesto</Button></Link>}
        />
      ) : (
        <div className="space-y-2">
          {quotes.map(quote => (
            <div key={quote.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">#{quote.number}</span>
                    <Badge
                      label={QUOTE_STATUS_LABELS[quote.status]}
                      className={QUOTE_STATUS_COLORS[quote.status]}
                    />
                    {quote.clientName && (
                      <span className="text-sm text-gray-600 truncate">{quote.clientName}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatDate(quote.date)}
                    {quote.validUntil && ` · Vence ${formatDate(quote.validUntil)}`}
                  </div>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <div className="text-base font-bold text-gray-900">{formatCurrency(quote.total)}</div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExpandedId(expandedId === quote.id ? null : quote.id)}
                      title="Ver detalle"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    >
                      {expandedId === quote.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(quote)}
                      title="Descargar PDF"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => handleWhatsApp(quote)}
                      title="Compartir por WhatsApp"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50"
                    >
                      <MessageCircle size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Detalle expandible */}
              {expandedId === quote.id && (quote as any).items?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                  {(quote as any).items.map((item: any, i: number) => (
                    <div key={i} className="flex items-start justify-between gap-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-800">{item.description}</span>
                        <span className="text-gray-400 ml-1.5">×{item.quantity}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-gray-900 font-medium">{formatCurrency(Number(item.unitPrice) * Number(item.quantity))}</div>
                        <div className="text-xs text-gray-400">{formatCurrency(Number(item.unitPrice))} c/u</div>
                      </div>
                    </div>
                  ))}
                  {Number((quote as any).discount) > 0 && (
                    <div className="flex justify-between text-xs text-red-500 pt-1 border-t border-gray-100">
                      <span>Descuento {(quote as any).discount}%</span>
                      <span>-{formatCurrency(Number((quote as any).subtotal) * Number((quote as any).discount) / 100)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Acciones para pendientes */}
              {quote.status === 'PENDING' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <Button size="sm" onClick={() => setConvertId(quote.id)} className="flex-1">
                    <CheckCircle size={14} />
                    Aprobar y vender
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleReject(quote.id)}>
                    <XCircle size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(quote.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: elegir método de pago para convertir */}
      <Modal open={!!convertId} onClose={() => { setConvertId(null); setConvertError('') }} title="Convertir a venta" size="sm">
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            Seleccioná el método de pago para registrar la venta.
          </p>
          <Select
            label="Método de pago"
            options={PAYMENT_OPTIONS}
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value)}
          />
          {convertError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {convertError}
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setConvertId(null); setConvertError('') }} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleConvert} loading={convertQuote.isPending} className="flex-1">
              Confirmar venta
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
