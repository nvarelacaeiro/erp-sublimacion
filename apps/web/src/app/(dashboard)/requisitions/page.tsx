'use client'
import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import {
  useRequisitions,
  useCreateRequisition,
  useUpdateRequisition,
  useDeleteRequisition,
  useSubmitRequisition,
  useApproveRequisition,
  useRejectRequisition,
  useMarkOrdered,
  type Requisition,
  type CreateRequisitionInput,
  type RequisitionPriority,
} from '@/hooks/useRequisitions'
import { useCreatePurchase } from '@/hooks/usePurchases'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  ClipboardList, Plus, ChevronDown, ChevronUp, Trash2, Send,
  CheckCircle2, XCircle, ShoppingCart, Pencil, X, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/shared/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { PurchaseForm } from '@/components/shared/PurchaseForm'
import { ExportButton } from '@/components/shared/ExportButton'
import { AuditLogPanel } from '@/components/shared/AuditLogPanel'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  ORDERED: 'Ordenada',
  CLOSED: 'Cerrada',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ORDERED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CLOSED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baja',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-gray-400',
  NORMAL: 'text-blue-500',
  HIGH: 'text-amber-500',
  URGENT: 'text-red-500',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[status])}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

function PriorityDot({ priority }: { priority: string }) {
  return (
    <span className={cn('text-xs font-medium', PRIORITY_COLORS[priority])}>
      {PRIORITY_LABELS[priority] ?? priority}
    </span>
  )
}

// ── Line item row inside the form ─────────────────────────────────────────────

interface FormItem {
  productId: string
  description: string
  quantity: number
  unit: string
  estimatedCost: string
}

function emptyItem(): FormItem {
  return { productId: '', description: '', quantity: 1, unit: 'un', estimatedCost: '' }
}

// ── Main form (create / edit) ─────────────────────────────────────────────────

interface RequisitionFormProps {
  initial?: Requisition | null
  onClose: () => void
}

function RequisitionForm({ initial, onClose }: RequisitionFormProps) {
  const products = useQuery({
    queryKey: ['products-list'],
    queryFn: () => api.get<{ id: string; name: string; sku: string | null; unit: string }[]>('/api/products'),
  })

  const [title, setTitle] = useState(initial?.title ?? '')
  const [priority, setPriority] = useState<RequisitionPriority>(initial?.priority ?? 'NORMAL')
  const [neededBy, setNeededBy] = useState(initial?.neededBy ? initial.neededBy.slice(0, 10) : '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [items, setItems] = useState<FormItem[]>(
    initial?.items.map(i => ({
      productId: i.productId ?? '',
      description: i.description,
      quantity: i.quantity,
      unit: i.unit,
      estimatedCost: i.estimatedCost != null ? String(i.estimatedCost) : '',
    })) ?? [emptyItem()],
  )
  const [error, setError] = useState('')

  const create = useCreateRequisition()
  const update = useUpdateRequisition()
  const loading = create.isPending || update.isPending

  function addItem() {
    setItems(prev => [...prev, emptyItem()])
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  function setItemField<K extends keyof FormItem>(i: number, field: K, value: FormItem[K]) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  function handleProductSelect(i: number, productId: string) {
    const product = products.data?.find(p => p.id === productId)
    setItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item
      return {
        ...item,
        productId,
        description: product ? product.name : item.description,
        unit: product ? product.unit : item.unit,
      }
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('El título es requerido'); return }
    if (items.length === 0) { setError('Agregá al menos un ítem'); return }
    const invalidItem = items.find(i => !i.description.trim() || i.quantity <= 0)
    if (invalidItem) { setError('Cada ítem debe tener descripción y cantidad válida'); return }

    setError('')
    const payload: CreateRequisitionInput = {
      title: title.trim(),
      priority,
      neededBy: neededBy || null,
      notes: notes.trim() || null,
      items: items.map(i => ({
        productId: i.productId || null,
        description: i.description.trim(),
        quantity: Number(i.quantity),
        unit: i.unit || 'un',
        estimatedCost: i.estimatedCost ? Number(i.estimatedCost) : null,
      })),
    }

    try {
      if (initial) {
        await update.mutateAsync({ id: initial.id, ...payload })
      } else {
        await create.mutateAsync(payload)
      }
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title + Priority */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Título *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ej: Materiales para producción de agosto"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div className="w-32">
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Prioridad</label>
          <select
            value={priority}
            onChange={e => setPriority(e.target.value as RequisitionPriority)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="LOW">Baja</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">Alta</option>
            <option value="URGENT">Urgente</option>
          </select>
        </div>
      </div>

      {/* Needed by + Notes */}
      <div className="flex gap-3">
        <div className="w-44">
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Necesaria para</label>
          <input
            type="date"
            value={neededBy}
            onChange={e => setNeededBy(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Notas</label>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Observaciones adicionales..."
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Ítems *</label>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
          >
            <Plus size={12} /> Agregar ítem
          </button>
        </div>

        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2 items-start bg-gray-50 dark:bg-slate-800/50 rounded-lg p-2">
              {/* Product selector */}
              <div className="w-40 shrink-0">
                <select
                  value={item.productId}
                  onChange={e => handleProductSelect(i, e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Producto (opcional)</option>
                  {products.data?.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="flex-1">
                <input
                  value={item.description}
                  onChange={e => setItemField(i, 'description', e.target.value)}
                  placeholder="Descripción *"
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Qty */}
              <input
                type="number"
                min="0.001"
                step="any"
                value={item.quantity}
                onChange={e => setItemField(i, 'quantity', Number(e.target.value))}
                className="w-16 px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
              />

              {/* Unit */}
              <input
                value={item.unit}
                onChange={e => setItemField(i, 'unit', e.target.value)}
                placeholder="un"
                className="w-14 px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
              />

              {/* Estimated cost */}
              <input
                type="number"
                min="0"
                step="any"
                value={item.estimatedCost}
                onChange={e => setItemField(i, 'estimatedCost', e.target.value)}
                placeholder="Costo est."
                className="w-24 px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
              />

              <button
                type="button"
                onClick={() => removeItem(i)}
                disabled={items.length === 1}
                className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" loading={loading} className="flex-1">
          <Check size={15} />
          {initial ? 'Guardar cambios' : 'Crear solicitud'}
        </Button>
      </div>
    </form>
  )
}

// ── Reject dialog ─────────────────────────────────────────────────────────────

function RejectDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const reject = useRejectRequisition()

  async function handleReject() {
    await reject.mutateAsync({ id, reason: reason.trim() || undefined })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl p-5 w-full max-w-sm">
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Rechazar solicitud</h3>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Motivo del rechazo (opcional)..."
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100 mb-3"
        />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleReject} loading={reject.isPending} className="flex-1 bg-red-600 hover:bg-red-700">
            Rechazar
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Requisition card ──────────────────────────────────────────────────────────

interface RequisitionCardProps {
  req: Requisition
  role: string
  userId: string
  onEdit: (r: Requisition) => void
  onConvert: (r: Requisition) => void
}

function RequisitionCard({ req, role, userId, onEdit, onConvert }: RequisitionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [actionError, setActionError] = useState('')

  const submit = useSubmitRequisition()
  const approve = useApproveRequisition()
  const remove = useDeleteRequisition()

  const isOwner = req.requestedBy.id === userId
  const canApprove = role === 'ADMIN' || role === 'APPROVER'
  const canEdit = req.status === 'DRAFT' && (role === 'ADMIN' || isOwner)
  const canDelete = req.status === 'DRAFT' && (role === 'ADMIN' || isOwner)
  const canSubmit = req.status === 'DRAFT' && (role === 'ADMIN' || isOwner)
  const canConvert = req.status === 'APPROVED' && canApprove && !req.purchase

  const totalEstimated = req.items.reduce((sum, i) => {
    if (i.estimatedCost == null) return sum
    return sum + i.quantity * i.estimatedCost
  }, 0)

  async function handleAction(action: () => Promise<any>) {
    setActionError('')
    try {
      await action()
    } catch (err: any) {
      setActionError(err.message ?? 'Error')
    }
  }

  return (
    <>
      {rejectOpen && <RejectDialog id={req.id} onClose={() => setRejectOpen(false)} />}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        {/* Header row */}
        <div className="flex items-start gap-3 px-4 py-3">
          <div className="pt-0.5">
            <span className="text-xs font-mono text-gray-400 dark:text-slate-500">#{req.number}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{req.title}</span>
              <StatusBadge status={req.status} />
              <PriorityDot priority={req.priority} />
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-slate-400 flex-wrap">
              <span>Por {req.requestedBy.name}</span>
              {req.approvedBy && <span>· Aprobado por {req.approvedBy.name}</span>}
              {req.neededBy && (
                <span>· Necesaria: {new Date(req.neededBy).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
              )}
              {totalEstimated > 0 && (
                <span>· Est. ${totalEstimated.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              )}
            </div>
            {req.status === 'REJECTED' && req.rejectionReason && (
              <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                Motivo: {req.rejectionReason}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {canSubmit && (
              <button
                onClick={() => handleAction(() => submit.mutateAsync(req.id))}
                disabled={submit.isPending}
                title="Enviar para aprobación"
                className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400 disabled:opacity-50"
              >
                <Send size={15} />
              </button>
            )}
            {canApprove && req.status === 'PENDING' && (
              <>
                <button
                  onClick={() => handleAction(() => approve.mutateAsync(req.id))}
                  disabled={approve.isPending}
                  title="Aprobar"
                  className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 disabled:opacity-50"
                >
                  <CheckCircle2 size={15} />
                </button>
                <button
                  onClick={() => setRejectOpen(true)}
                  title="Rechazar"
                  className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
                >
                  <XCircle size={15} />
                </button>
              </>
            )}
            {canConvert && (
              <button
                onClick={() => onConvert(req)}
                title="Convertir a compra"
                className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <ShoppingCart size={15} />
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => onEdit(req)}
                title="Editar"
                className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <Pencil size={15} />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => handleAction(() => remove.mutateAsync(req.id))}
                disabled={remove.isPending}
                title="Eliminar"
                className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
              >
                <Trash2 size={15} />
              </button>
            )}
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-2 rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>

        {actionError && (
          <div className="px-4 pb-2 text-xs text-red-600 dark:text-red-400">{actionError}</div>
        )}

        {/* Expanded items */}
        {expanded && (
          <div className="border-t border-gray-100 dark:border-slate-700 px-4 py-3">
            {req.notes && (
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-2 italic">{req.notes}</p>
            )}
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 dark:text-slate-400">
                  <th className="text-left pb-1 font-medium">Descripción</th>
                  <th className="text-right pb-1 font-medium w-16">Cant.</th>
                  <th className="text-right pb-1 font-medium w-16">Unidad</th>
                  <th className="text-right pb-1 font-medium w-24">Costo est.</th>
                  <th className="text-right pb-1 font-medium w-24">Total est.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                {req.items.map(item => (
                  <tr key={item.id}>
                    <td className="py-1 text-gray-700 dark:text-slate-300">
                      {item.description}
                      {item.product && (
                        <span className="ml-1 text-gray-400 dark:text-slate-500">({item.product.sku ?? item.product.name})</span>
                      )}
                    </td>
                    <td className="py-1 text-right text-gray-700 dark:text-slate-300">{item.quantity}</td>
                    <td className="py-1 text-right text-gray-500 dark:text-slate-400">{item.unit}</td>
                    <td className="py-1 text-right text-gray-700 dark:text-slate-300">
                      {item.estimatedCost != null
                        ? `$${item.estimatedCost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td className="py-1 text-right text-gray-700 dark:text-slate-300">
                      {item.estimatedCost != null
                        ? `$${(item.quantity * item.estimatedCost).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              {totalEstimated > 0 && (
                <tfoot>
                  <tr className="border-t border-gray-200 dark:border-slate-600">
                    <td colSpan={4} className="pt-1.5 text-right font-semibold text-gray-700 dark:text-slate-300">Total estimado</td>
                    <td className="pt-1.5 text-right font-semibold text-gray-900 dark:text-slate-100">
                      ${totalEstimated.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>

            {/* Historial */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700">
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Historial</p>
              <AuditLogPanel entity="requisition" entityId={req.id} />
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type FilterStatus = 'ALL' | 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ORDERED'

export default function RequisitionsPage() {
  const { user } = useAuthStore()
  const role = user?.role ?? 'REQUESTER'
  const userId = user?.id ?? ''

  const { data: requisitions = [], isLoading } = useRequisitions()
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Requisition | null>(null)
  const [filter, setFilter] = useState<FilterStatus>('ALL')

  // Convert to purchase state
  const [convertTarget, setConvertTarget] = useState<Requisition | null>(null)
  const [prefillItems, setPrefillItems] = useState<any[]>([])
  const [prefillLoading, setPrefillLoading] = useState(false)
  const createPurchase = useCreatePurchase()
  const markOrdered = useMarkOrdered()

  const canApprove = role === 'ADMIN' || role === 'APPROVER'

  const filtered = filter === 'ALL'
    ? requisitions
    : requisitions.filter(r => r.status === filter)

  const pendingCount = requisitions.filter(r => r.status === 'PENDING').length

  function handleEdit(r: Requisition) {
    setEditTarget(r)
    setShowForm(true)
  }

  function handleCloseForm() {
    setShowForm(false)
    setEditTarget(null)
  }

  async function handleConvert(r: Requisition) {
    setPrefillLoading(true)
    try {
      const data = await api.get<any>(`/api/requisitions/${r.id}/purchase-prefill`)
      setPrefillItems(data.items.map((i: any) => ({
        productId: i.productId ?? null,
        description: i.description,
        quantity: i.quantity,
        unitCost: i.unitCost,
      })))
      setConvertTarget(r)
    } catch (err: any) {
      alert(err.message ?? 'Error al cargar datos de la solicitud')
    } finally {
      setPrefillLoading(false)
    }
  }

  async function handlePurchaseSave(data: any) {
    const purchase = await createPurchase.mutateAsync(data)
    if (convertTarget) {
      await markOrdered.mutateAsync({ id: convertTarget.id, purchaseId: (purchase as any).id })
    }
    setConvertTarget(null)
    setPrefillItems([])
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Modal: convertir a compra */}
      {convertTarget && (
        <Modal
          open={!!convertTarget}
          onClose={() => { setConvertTarget(null); setPrefillItems([]) }}
          title={`Compra desde Solicitud #${convertTarget.number}`}
          size="lg"
        >
          <PurchaseForm
            initialItems={prefillItems}
            initialNotes={`Solicitud #${convertTarget.number}: ${convertTarget.title}`}
            onSave={handlePurchaseSave}
            onCancel={() => { setConvertTarget(null); setPrefillItems([]) }}
            loading={createPurchase.isPending || markOrdered.isPending}
          />
        </Modal>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Solicitudes de compra</h1>
          {canApprove && pendingCount > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-0.5">
              {pendingCount} solicitud{pendingCount !== 1 ? 'es' : ''} pendiente{pendingCount !== 1 ? 's' : ''} de aprobación
            </p>
          )}
        </div>
        <ExportButton
          filename="solicitudes"
          sheetName="Solicitudes"
          getData={() => filtered.map(r => ({
            Número: r.number,
            Título: r.title,
            Estado: STATUS_LABELS[r.status] ?? r.status,
            Prioridad: PRIORITY_LABELS[r.priority] ?? r.priority,
            Solicitado_por: r.requestedBy.name,
            Aprobado_por: r.approvedBy?.name ?? '',
            Necesaria_para: r.neededBy ? new Date(r.neededBy).toLocaleDateString('es-AR') : '',
            Notas: r.notes ?? '',
            Creada: new Date(r.createdAt).toLocaleDateString('es-AR'),
          }))}
        />
        <Button onClick={() => { setEditTarget(null); setShowForm(true) }}>
          <Plus size={16} /> Nueva solicitud
        </Button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-4">
            {editTarget ? 'Editar solicitud' : 'Nueva solicitud'}
          </h2>
          <RequisitionForm initial={editTarget} onClose={handleCloseForm} />
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {(['ALL', 'DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'ORDERED'] as FilterStatus[]).map(s => {
          const count = s === 'ALL' ? requisitions.length : requisitions.filter(r => r.status === s).length
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                filter === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-primary-400',
              )}
            >
              {s === 'ALL' ? 'Todas' : STATUS_LABELS[s]} ({count})
            </button>
          )
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Sin solicitudes"
          description={filter === 'ALL' ? 'Creá tu primera solicitud de compra.' : `No hay solicitudes en estado "${STATUS_LABELS[filter]}".`}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(req => (
            <RequisitionCard
              key={req.id}
              req={req}
              role={role}
              userId={userId}
              onEdit={handleEdit}
              onConvert={handleConvert}
            />
          ))}
        </div>
      )}
    </div>
  )
}
