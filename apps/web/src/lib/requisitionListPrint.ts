import { Requisition } from '@/hooks/useRequisitions'

const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 }

function openPrint(html: string) {
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

const BASE_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; background: white; padding: 40px; font-size: 12px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #4f46e5; }
  .logo-wrap { display: flex; align-items: center; gap: 8px; }
  .logo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; width: 20px; height: 20px; }
  .logo-sq { border-radius: 2px; background: #4f46e5; }
  .logo-sq.dim { opacity: 0.45; }
  .wordmark { font-size: 16px; font-weight: 700; letter-spacing: -0.4px; color: #4f46e5; }
  .doc-title { font-size: 17px; font-weight: 700; color: #1a1a1a; }
  .doc-date { font-size: 11px; color: #6b7280; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  thead th { padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 1.5px solid #e2e8f0; background: #f8fafc; }
  th.c, td.c { text-align: center; }
  tbody tr { border-bottom: 1px solid #f1f5f9; }
  tbody tr:last-child { border-bottom: 2px solid #e2e8f0; }
  tbody td { padding: 9px 10px; vertical-align: middle; font-size: 12px; }
  .group-label { margin-top: 24px; margin-bottom: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #6366f1; }
  .footer { margin-top: 28px; font-size: 10px; color: #9ca3af; text-align: right; }
  @media print { body { padding: 28px; } @page { margin: 0; size: A4; } }
`

// ── Consolidated list (all pending) ──────────────────────────────────────────

export function printRequisitionList(requisitions: Requisition[], projectLabel = 'Obra') {
  const pending = requisitions
    .filter(r => r.status === 'PENDING')
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9))

  if (pending.length === 0) return

  const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  // Group by project
  const groups = new Map<string, { label: string; items: { req: Requisition; item: Requisition['items'][0] }[] }>()
  for (const req of pending) {
    const key = req.project?.id ?? '__none__'
    const label = req.project?.name ?? ''
    if (!groups.has(key)) groups.set(key, { label, items: [] })
    for (const item of req.items) groups.get(key)!.items.push({ req, item })
  }

  const groupSections = [...groups.values()].map(({ label, items }) => {
    const rows = items.map(({ req, item }) => `
      <tr>
        <td>${item.description}</td>
        <td class="c">${item.quantity}</td>
        <td class="c">${item.unit}</td>
        <td class="c">${req.neededBy ? new Date(req.neededBy).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</td>
      </tr>
    `).join('')

    return `
      ${label ? `<div class="group-label">${label}</div>` : ''}
      <table>
        <thead><tr>
          <th>Descripción</th>
          <th class="c" style="width:70px">Cantidad</th>
          <th class="c" style="width:70px">Unidad</th>
          <th class="c" style="width:110px">Para cuándo</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `
  }).join('')

  openPrint(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
  <title>Pedido de cotización — ${today}</title>
  <style>${BASE_STYLES}</style></head><body>
  <div class="header">
    <div class="logo-wrap">
      <div class="logo-grid">
        <div class="logo-sq"></div><div class="logo-sq dim"></div>
        <div class="logo-sq dim"></div><div class="logo-sq"></div>
      </div>
      <span class="wordmark">norde</span>
    </div>
    <div style="text-align:right">
      <div class="doc-title">Pedido de cotización</div>
      <div class="doc-date">${today}</div>
    </div>
  </div>
  ${groupSections}
  <div class="footer">norde · ${today}</div>
  <script>window.onload=()=>{window.print()}</script>
  </body></html>`)
}

// ── Single requisition ────────────────────────────────────────────────────────

export function printSingleRequisition(req: Requisition) {
  const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const created = new Date(req.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const rows = req.items.map(item => `
    <tr>
      <td>${item.description}</td>
      <td class="c">${item.quantity}</td>
      <td class="c">${item.unit}</td>
      <td class="c">${req.neededBy ? new Date(req.neededBy).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</td>
    </tr>
  `).join('')

  const projectLine = req.project ? `<div style="margin-bottom:6px;font-size:12px;color:#374151;">Proyecto: <strong>${req.project.name}</strong></div>` : ''
  const notesLine = req.notes ? `<div style="margin-top:20px;padding:12px 14px;background:#f8fafc;border-left:3px solid #4f46e5;border-radius:4px;font-size:12px;color:#374151;">${req.notes}</div>` : ''

  openPrint(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
  <title>Solicitud #${req.number} — ${today}</title>
  <style>${BASE_STYLES}</style></head><body>
  <div class="header">
    <div class="logo-wrap">
      <div class="logo-grid">
        <div class="logo-sq"></div><div class="logo-sq dim"></div>
        <div class="logo-sq dim"></div><div class="logo-sq"></div>
      </div>
      <span class="wordmark">norde</span>
    </div>
    <div style="text-align:right">
      <div class="doc-title">Solicitud #${req.number}</div>
      <div class="doc-date">${created}</div>
    </div>
  </div>
  <div style="margin-bottom:16px;">
    <div style="font-size:15px;font-weight:700;color:#1a1a1a;margin-bottom:4px;">${req.title}</div>
    ${projectLine}
  </div>
  <table>
    <thead><tr>
      <th>Descripción</th>
      <th class="c" style="width:70px">Cantidad</th>
      <th class="c" style="width:70px">Unidad</th>
      <th class="c" style="width:110px">Para cuándo</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${notesLine}
  <div class="footer">norde · ${today}</div>
  <script>window.onload=()=>{window.print()}</script>
  </body></html>`)
}
