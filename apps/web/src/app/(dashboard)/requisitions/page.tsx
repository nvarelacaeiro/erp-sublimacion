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
import { useProjects, useCreateProject } from '@/hooks/useProjects'
import { useCreatePurchase } from '@/hooks/usePurchases'
import { useSettings } from '@/hooks/useSettings'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  ClipboardList, Plus, ChevronDown, ChevronUp, Trash2, Send,
  CheckCircle2, XCircle, ShoppingCart, Pencil, X, Check, Building2, FileDown,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/shared/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { PurchaseForm } from '@/components/shared/PurchaseForm'
import { ExportButton } from '@/components/shared/ExportButton'
import { AuditLogPanel } from '@/components/shared/AuditLogPanel'
import { cn } from '@/lib/utils'
import { printRequisitionList, printSingleRequisition } from '@/lib/requisitionListPrint'

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
  projectLabel?: string
}

function RequisitionForm({ initial, onClose, projectLabel = 'Obra' }: RequisitionFormProps) {
  const products = useQuery({
    queryKey: ['products-list'],
    queryFn: () => api.get<{ id: string; name: string; sku: string | null; unit: string }[]>('/api/products'),
  })

  const { data: projects = [] } = useProjects()
  const createProject = useCreateProject()

  // obra state
  const [projectId, setProjectId] = useState(initial?.projectId ?? '')
  const [newProjectName, setNewProjectName] = useState('')
  const isCreatingNewProject = projectId === '__new__'

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
  const loading = create.isPending || update.isPending || createProject.isPending

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

    // Si está creando obra nueva, crearla primero
    let finalProjectId: string | null = projectId || null
    if (isCreatingNewProject) {
      if (!newProjectName.trim()) { setError('Ingresá el nombre de la obra'); return }
      try {
        const proj = await createProject.mutateAsync({ name: newProjectName.trim() })
        finalProjectId = proj.id
      } catch (err: any) {
        setError(err.message ?? 'Error al crear la obra')
        return
      }
    }

    const payload: CreateRequisitionInput = {
      title: title.trim(),
      priority,
      neededBy: neededBy || null,
      notes: notes.trim() || null,
      projectId: finalProjectId,
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

      {/* Obra */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
          <Building2 size={12} className="inline mr-1" />{projectLabel}
        </label>
        <select
          value={projectId}
          onChange={e => { setProjectId(e.target.value); setNewProjectName('') }}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Sin {projectLabel.toLowerCase()} asignada</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
          <option value="__new__">+ Nueva {projectLabel.toLowerCase()}...</option>
        </select>
        {isCreatingNewProject && (
          <input
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            placeholder={`Nombre de la nueva ${projectLabel.toLowerCase()} *`}
            autoFocus
            className="mt-2 w-full px-3 py-2 text-sm border border-primary-400 dark:border-primary-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
          />
        )}
      </div>

      {/* Title + Priority */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Título *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ej: Materiales para producción de agosto"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div className="sm:w-32">
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
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="sm:w-44">
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
            <div key={i} className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 space-y-2">
              {/* Row 1: Producto + Descripción */}
              <div className="flex gap-2">
                <div className="w-36 sm:w-44 shrink-0">
                  <select
                    value={item.productId}
                    onChange={e => handleProductSelect(i, e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">Producto</option>
                    {products.data?.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <input
                    value={item.description}
                    onChange={e => setItemField(i, 'description', e.target.value)}
                    placeholder="Descripción *"
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
              {/* Row 2: Qty + Unit + Costo + Remove */}
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 dark:text-slate-500 block mb-0.5">Cantidad</label>
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    value={item.quantity}
                    onChange={e => setItemField(i, 'quantity', Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="w-16 sm:w-20">
                  <label className="text-[10px] text-gray-400 dark:text-slate-500 block mb-0.5">Unidad</label>
                  <input
                    value={item.unit}
                    onChange={e => setItemField(i, 'unit', e.target.value)}
                    placeholder="un"
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 dark:text-slate-500 block mb-0.5">Costo est.</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={item.estimatedCost}
                    onChange={e => setItemField(i, 'estimatedCost', e.target.value)}
                    placeholder="$0"
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  disabled={items.length === 1}
                  className="mt-4 p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
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
  approversWithPhone: { id: string; name: string; phone: string | null }[]
  projectLabel: string
}

function RequisitionCard({ req, role, userId, onEdit, onConvert, approversWithPhone, projectLabel }: RequisitionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [actionError, setActionError] = useState('')

  const submit = useSubmitRequisition()
  const approve = useApproveRequisition()
  const remove = useDeleteRequisition()

  const isOwner = req.requestedBy.id === userId
  const canApprove = role === 'ADMIN' || role === 'APPROVER'
  // Solicitante edita en DRAFT; aprobador puede editar también en PENDING
  const canEdit = (req.status === 'DRAFT' && (role === 'ADMIN' || isOwner)) ||
                  (req.status === 'PENDING' && canApprove)
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
              {req.project && (
                <span className="flex items-center gap-1">
                  <Building2 size={11} />
                  {req.project.name}
                </span>
              )}
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
            {req.status === 'PENDING' && approversWithPhone.map(approver => (
              <a
                key={approver.id}
                href={`https://wa.me/${approver.phone}?text=${encodeURIComponent(`Hola ${approver.name}, hay una solicitud de compra pendiente de aprobación:\n\n📋 #${req.number} - ${req.title}${req.project ? `\n🏗️ ${projectLabel}: ${req.project.name}` : ''}\nSolicitado por: ${req.requestedBy.name}\n\nPor favor ingresá al sistema para aprobarla o rechazarla.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`Avisar a ${approver.name} por WhatsApp`}
                className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            ))}
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
            <button
              onClick={() => printSingleRequisition(req)}
              title="Descargar PDF"
              className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400"
            >
              <FileDown size={15} />
            </button>
            {/* canConvert se muestra como banner abajo, no como ícono */}
            {canEdit && (
              <button
                onClick={() => onEdit(req)}
                title={req.status === 'PENDING' ? 'Editar (aprobador)' : 'Editar'}
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

        {/* Banner: convertir a compra */}
        {canConvert && (
          <div className="mx-3 mb-3 flex items-center justify-between gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-300">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>Solicitud aprobada — lista para generar orden de compra</span>
            </div>
            <button
              onClick={() => onConvert(req)}
              className="shrink-0 flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <ShoppingCart size={13} />
              Generar compra
            </button>
          </div>
        )}

        {/* Expanded items */}
        {expanded && (
          <div className="border-t border-gray-100 dark:border-slate-700 px-4 py-3">
            {req.notes && (
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-2 italic">{req.notes}</p>
            )}
            {/* Items: tabla en desktop, cards en mobile */}
            <div className="hidden sm:block">
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
                        {item.estimatedCost != null ? `$${item.estimatedCost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="py-1 text-right text-gray-700 dark:text-slate-300">
                        {item.estimatedCost != null ? `$${(item.quantity * item.estimatedCost).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '—'}
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
            </div>
            {/* Mobile: cards por ítem */}
            <div className="sm:hidden space-y-2">
              {req.items.map(item => (
                <div key={item.id} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 text-xs">
                  <div className="font-medium text-gray-800 dark:text-slate-200 mb-1">{item.description}</div>
                  <div className="flex gap-4 text-gray-500 dark:text-slate-400">
                    <span>{item.quantity} {item.unit}</span>
                    {item.estimatedCost != null && (
                      <span>Total: ${(item.quantity * item.estimatedCost).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    )}
                  </div>
                </div>
              ))}
              {totalEstimated > 0 && (
                <div className="text-right text-xs font-semibold text-gray-800 dark:text-slate-200 pt-1">
                  Total estimado: ${totalEstimated.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </div>
              )}
            </div>

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

  const { data: settings } = useSettings()
  const projectLabel = settings?.projectLabel ?? 'Obra'

  const { data: approvers = [] } = useQuery({
    queryKey: ['approvers'],
    queryFn: () => api.get<{ id: string; name: string; phone: string | null }[]>('/api/users/approvers'),
  })
  const approversWithPhone = approvers.filter(a => a.phone)

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
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Solicitudes de compra</h1>
          {canApprove && pendingCount > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-0.5">
              {pendingCount} solicitud{pendingCount !== 1 ? 'es' : ''} pendiente{pendingCount !== 1 ? 's' : ''} de aprobación
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canApprove && pendingCount > 0 && (
            <button
              onClick={() => printRequisitionList(requisitions, projectLabel)}
              title="Descargar lista para cotizar con proveedores"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            >
              <FileDown size={15} />
              <span className="hidden sm:inline">Lista para cotizar</span>
            </button>
          )}
          <ExportButton
            filename="solicitudes"
            sheetName="Solicitudes"
            getData={() => filtered.map(r => ({
              Número: r.number,
              Obra: r.project?.name ?? '',
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
            <Plus size={16} />
            <span className="hidden sm:inline">Nueva solicitud</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
        </div>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-4">
            {editTarget
              ? editTarget.status === 'PENDING'
                ? `Editar solicitud #${editTarget.number} (revisión de aprobador)`
                : 'Editar solicitud'
              : 'Nueva solicitud'}
          </h2>
          <RequisitionForm initial={editTarget} onClose={handleCloseForm} projectLabel={projectLabel} />
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
              approversWithPhone={approversWithPhone}
              projectLabel={projectLabel}
            />
          ))}
        </div>
      )}
    </div>
  )
}
