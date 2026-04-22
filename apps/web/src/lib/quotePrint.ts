import { formatCurrency, formatDate } from '@/lib/utils'

export function openQuotePrintWindow(quote: any) {
  const clientName = quote.clientName ?? 'Sin cliente'
  const clientBusinessName = quote.clientBusinessName ?? null
  const clientEmail = quote.clientEmail ?? null
  const clientPhone = quote.clientPhone ?? null
  const items = quote.items ?? []
  const notes = quote.notes ?? ''

  const rows = items.map((item: any) => `
    <tr>
      <td>${item.description}</td>
      <td class="center">${item.quantity}</td>
      <td class="right">${formatCurrency(Number(item.unitPrice))}</td>
      <td class="right"><strong>${formatCurrency(Number(item.quantity) * Number(item.unitPrice))}</strong></td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Presupuesto #${quote.number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; background: white; padding: 48px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .company-logo { height: 36px; width: auto; display: block; }
    .company-sub { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .doc-info { text-align: right; }
    .doc-number { font-size: 20px; font-weight: 700; color: #1a1a1a; }
    .doc-label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .doc-date { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .divider { border: none; border-top: 2px solid #4f46e5; margin: 0 0 32px; }
    .client-section { margin-bottom: 32px; }
    .section-label { font-size: 10px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; }
    .client-name { font-size: 16px; font-weight: 600; color: #1a1a1a; }
    .client-detail { font-size: 12px; color: #6b7280; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: #F0F4F8; }
    thead th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #4f46e5; }
    thead th.center { text-align: center; }
    thead th.right { text-align: right; }
    tbody tr { border-bottom: 1px solid #E8EEF5; }
    tbody tr:last-child { border-bottom: none; }
    tbody td { padding: 12px; font-size: 13px; color: #374151; vertical-align: top; }
    td.center { text-align: center; }
    td.right { text-align: right; }
    .totals { margin-left: auto; width: 260px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #6b7280; }
    .total-row.final { border-top: 2px solid #4f46e5; margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: 700; color: #1a1a1a; }
    .notes { margin-top: 32px; padding: 16px; background: #eef2ff; border-radius: 8px; border-left: 3px solid #4f46e5; }
    .notes p { font-size: 12px; color: #6b7280; line-height: 1.6; }
    .footer { margin-top: 48px; text-align: center; font-size: 11px; color: #6366f1; }
    @media print {
      body { padding: 32px; }
      @page { margin: 0; size: A4; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <svg width="110" height="28" viewBox="0 0 110 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Norde" class="company-logo">
        <path d="M 7 1 L 13 14 L 7 27 L 1 14 Z" fill="#4f46e5"/>
        <text x="22" y="20" font-family="'Helvetica Neue', Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="-0.5" fill="#4f46e5">norde</text>
      </svg>
      <div class="company-sub">Presupuesto comercial</div>
    </div>
    <div class="doc-info">
      <div class="doc-label">Presupuesto</div>
      <div class="doc-number">#${quote.number}</div>
      <div class="doc-date">${formatDate(quote.date)}</div>
    </div>
  </div>

  <hr class="divider" />

  <div class="client-section">
    <div class="section-label">Cliente</div>
    <div class="client-name">${clientName}</div>
    ${clientBusinessName ? `<div class="client-detail">${clientBusinessName}</div>` : ''}
    ${clientEmail ? `<div class="client-detail">${clientEmail}</div>` : ''}
    ${clientPhone ? `<div class="client-detail">${clientPhone}</div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th class="center">Cantidad</th>
        <th class="right">Precio unit.</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="totals">
    ${Number(quote.discount) > 0 ? `
      <div class="total-row">
        <span>Subtotal</span>
        <span>${formatCurrency(Number(quote.subtotal))}</span>
      </div>
      <div class="total-row">
        <span>Descuento (${quote.discount}%)</span>
        <span>-${formatCurrency(Number(quote.subtotal) * Number(quote.discount) / 100)}</span>
      </div>
    ` : ''}
    <div class="total-row final">
      <span>Total</span>
      <span>${formatCurrency(Number(quote.total))}</span>
    </div>
  </div>

  ${notes ? `
  <div class="notes">
    <div class="section-label" style="margin-bottom:6px;">Notas</div>
    <p>${notes}</p>
  </div>
  ` : ''}

  <div class="footer">Presupuesto generado el ${new Date().toLocaleDateString('es-AR')} · Válido por 15 días</div>

  <script>window.onload = () => { window.print() }</script>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

export function buildWhatsAppText(quote: any): string {
  const client = quote.clientName ? `para *${quote.clientName}*` : ''
  const items = (quote.items ?? []).map((i: any) =>
    `• ${i.description} x${i.quantity} = ${formatCurrency(Number(i.quantity) * Number(i.unitPrice))}`,
  ).join('\n')
  const total = formatCurrency(Number(quote.total))

  return encodeURIComponent(
    `*Presupuesto #${quote.number}* ${client}\n\n${items}\n\n*Total: ${total}*${quote.notes ? `\n\n_${quote.notes}_` : ''}`,
  )
}
