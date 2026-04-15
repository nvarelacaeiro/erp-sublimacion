'use client'
import { useState } from 'react'
import { useDeliveryNotes, useCreateDeliveryNote, useDeleteDeliveryNote } from '@/hooks/useDeliveryNotes'
import { useSales } from '@/hooks/useSales'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FileText, Plus, Trash2, ChevronDown, ChevronUp, Search, Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'

// ── Formulario de nuevo remito ────────────────────────────────────────────────

function NewDeliveryNoteForm({ onClose }: { onClose: () => void }) {
  const [saleSearch, setSaleSearch] = useState('')
  const [selectedSaleId, setSelectedSaleId] = useState('')
  const [selectedSaleName, setSelectedSaleName] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const { data: allSales = [] } = useSales()
  const create = useCreateDeliveryNote()

  const filteredSales = saleSearch
    ? allSales.filter((s: any) =>
        String(s.number).includes(saleSearch) ||
        s.clientName?.toLowerCase().includes(saleSearch.toLowerCase()),
      ).slice(0, 8)
    : []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSaleId) { setError('Seleccioná una venta'); return }
    setError('')
    try {
      await create.mutateAsync({ saleId: selectedSaleId, notes: notes.trim() || null })
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Error al crear remito')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-1">Venta *</label>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={selectedSaleId ? selectedSaleName : saleSearch}
            onChange={e => {
              setSaleSearch(e.target.value)
              setSelectedSaleId('')
              setSelectedSaleName('')
            }}
            placeholder="Buscar por número o cliente..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>
        {saleSearch && !selectedSaleId && filteredSales.length > 0 && (
          <div className="border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 shadow-sm divide-y dark:divide-slate-700 mt-1 max-h-48 overflow-y-auto">
            {filteredSales.map((s: any) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelectedSaleId(s.id)
                  setSelectedSaleName(`#${s.number} — ${s.clientName ?? 'Sin cliente'}`)
                  setSaleSearch('')
                }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 dark:text-slate-200 flex justify-between"
              >
                <span>#{s.number} · {s.clientName ?? 'Sin cliente'}</span>
                <span className="text-gray-400 dark:text-slate-500 text-xs">{formatCurrency(s.total)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-1">Observaciones</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Notas del remito (opcional)..."
          className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
        <Button type="submit" loading={create.isPending} className="flex-1">Generar remito</Button>
      </div>
    </form>
  )
}

// ── Remito card ───────────────────────────────────────────────────────────────

function DeliveryNoteCard({ note }: { note: any }) {
  const [expanded, setExpanded] = useState(false)
  const remove = useDeleteDeliveryNote()

  function handlePrint() {
    const win = window.open('', '_blank')
    if (!win) return
    const items = note.sale.items.map((item: any) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${item.description}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${item.quantity}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">$${Number(item.unitPrice).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">$${Number(item.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('')

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Remito #${note.number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          .sub { color: #666; font-size: 13px; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #f5f5f5; padding: 8px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
          th:last-child, th:nth-child(2), th:nth-child(3) { text-align: right; }
          .total { text-align: right; font-weight: bold; margin-top: 12px; font-size: 16px; }
          .footer { margin-top: 48px; font-size: 12px; color: #999; text-align: center; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <h1>Remito #${note.number}</h1>
        <div class="sub">
          Venta #${note.sale.number} &nbsp;·&nbsp;
          Cliente: ${note.sale.client?.name ?? 'Sin cliente'} &nbsp;·&nbsp;
          Fecha: ${new Date(note.date).toLocaleDateString('es-AR')}
          ${note.notes ? '<br>Obs: ' + note.notes : ''}
        </div>
        <table>
          <thead>
            <tr>
              <th>Descripción</th>
              <th style="text-align:right">Cant.</th>
              <th style="text-align:right">Precio unit.</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${items}</tbody>
        </table>
        <div class="total">Total: $${Number(note.sale.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
        <div class="footer">Documento no válido como factura</div>
        <script>window.onload = () => window.print()</script>
      </body>
      </html>
    `)
    win.document.close()
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/30">
          <FileText size={15} className="text-primary-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              Remito #{note.number}
            </span>
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Venta #{note.sale.number}
            </span>
            {note.sale.client && (
              <span className="text-xs text-gray-500 dark:text-slate-400">
                · {note.sale.client.name}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
            {formatDate(note.date)}
            {note.notes && <span> · {note.notes}</span>}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-sm font-bold text-gray-900 dark:text-slate-100 mr-2">
            {formatCurrency(note.sale.total)}
          </span>
          <button
            onClick={handlePrint}
            title="Imprimir remito"
            className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 dark:hover:text-primary-400"
          >
            <Printer size={15} />
          </button>
          <button
            onClick={() => {
              if (!confirm('¿Eliminar este remito?')) return
              remove.mutate(note.id)
            }}
            disabled={remove.isPending}
            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
          >
            <Trash2 size={15} />
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {expanded && note.sale.items?.length > 0 && (
        <div className="border-t border-gray-100 dark:border-slate-700 px-4 py-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 dark:text-slate-400">
                <th className="text-left pb-1.5 font-medium">Descripción</th>
                <th className="text-right pb-1.5 font-medium w-16">Cant.</th>
                <th className="text-right pb-1.5 font-medium w-24">P. unit.</th>
                <th className="text-right pb-1.5 font-medium w-24">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
              {note.sale.items.map((item: any) => (
                <tr key={item.id}>
                  <td className="py-1 text-gray-700 dark:text-slate-300">{item.description}</td>
                  <td className="py-1 text-right text-gray-700 dark:text-slate-300">{item.quantity}</td>
                  <td className="py-1 text-right text-gray-700 dark:text-slate-300">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-1 text-right font-medium text-gray-900 dark:text-slate-100">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 dark:border-slate-600">
                <td colSpan={3} className="pt-1.5 text-right font-semibold text-gray-700 dark:text-slate-300">Total</td>
                <td className="pt-1.5 text-right font-bold text-gray-900 dark:text-slate-100">{formatCurrency(note.sale.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DeliveryNotesPage() {
  const [showForm, setShowForm] = useState(false)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const { data: notes = [], isLoading } = useDeliveryNotes({
    from: fromDate || undefined,
    to: toDate || undefined,
  })

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Filters + action */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="date"
          value={fromDate}
          onChange={e => setFromDate(e.target.value)}
          className="px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
        />
        <input
          type="date"
          value={toDate}
          onChange={e => setToDate(e.target.value)}
          className="px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
        />
        {(fromDate || toDate) && (
          <button
            onClick={() => { setFromDate(''); setToDate('') }}
            className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 px-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            Limpiar
          </button>
        )}
        <div className="ml-auto">
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} /> Nuevo remito
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 animate-pulse" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin remitos"
          description="Generá remitos de despacho asociados a tus ventas."
          action={<Button onClick={() => setShowForm(true)}><Plus size={16} /> Nuevo remito</Button>}
        />
      ) : (
        <div className="space-y-2">
          {notes.map((note: any) => (
            <DeliveryNoteCard key={note.id} note={note} />
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo remito">
        <NewDeliveryNoteForm onClose={() => setShowForm(false)} />
      </Modal>
    </div>
  )
}
