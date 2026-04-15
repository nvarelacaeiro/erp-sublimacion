'use client'
import { useAuditLog, actionLabel } from '@/hooks/useAuditLog'
import { History } from 'lucide-react'

interface AuditLogPanelProps {
  entity: string
  entityId: string
}

export function AuditLogPanel({ entity, entityId }: AuditLogPanelProps) {
  const { data: logs = [], isLoading } = useAuditLog(entity, entityId)

  if (isLoading) {
    return <div className="h-8 animate-pulse rounded bg-gray-100 dark:bg-slate-700" />
  }

  if (logs.length === 0) {
    return (
      <p className="text-xs text-gray-400 dark:text-slate-500 italic">Sin historial registrado.</p>
    )
  }

  return (
    <div className="space-y-2">
      {logs.map(log => (
        <div key={log.id} className="flex items-start gap-2 text-xs">
          <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-medium text-gray-800 dark:text-slate-200">{actionLabel(log.action)}</span>
            <span className="text-gray-500 dark:text-slate-400"> · {log.userName}</span>
            <span className="text-gray-400 dark:text-slate-500 ml-1">
              {new Date(log.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
            {log.data?.reason && (
              <div className="text-gray-500 dark:text-slate-400 italic mt-0.5">"{log.data.reason}"</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
