/**
 * Stock Alert Service
 *
 * Detects products with stock <= minStock and sends WhatsApp alerts via Callmebot.
 *
 * Setup (one-time):
 *  1. Add +34 644 82 82 81 to your WhatsApp contacts as "CallMeBot"
 *  2. Send this message to that contact: "I allow callmebot to send me messages"
 *  3. You'll receive your API key by WhatsApp
 *  4. Set env vars:
 *       WHATSAPP_ALERT_PHONE=5493513052919   (digits only, no + or spaces)
 *       WHATSAPP_CALLMEBOT_KEY=your_api_key
 */

import { prisma } from '../lib/prisma'

const PHONE = process.env.WHATSAPP_ALERT_PHONE ?? ''
const API_KEY = process.env.WHATSAPP_CALLMEBOT_KEY ?? ''
const REMINDER_DAYS = 3

async function sendWhatsApp(message: string): Promise<void> {
  if (!PHONE || !API_KEY) {
    console.warn('[StockAlert] WHATSAPP_ALERT_PHONE or WHATSAPP_CALLMEBOT_KEY not set — skipping send')
    return
  }

  const url = `https://api.callmebot.com/whatsapp.php?phone=${PHONE}&text=${encodeURIComponent(message)}&apikey=${API_KEY}`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) {
      console.error(`[StockAlert] WhatsApp send failed: ${res.status} ${res.statusText}`)
    } else {
      console.log(`[StockAlert] WhatsApp sent to ${PHONE}`)
    }
  } catch (err: any) {
    console.error(`[StockAlert] WhatsApp send error: ${err.message}`)
  }
}

function buildAlertMessage(product: { name: string; stock: number; minStock: number }): string {
  return (
    `⚠️ Alerta de stock bajo\n` +
    `Producto: ${product.name}\n` +
    `Stock actual: ${product.stock} un\n` +
    `Stock mínimo: ${product.minStock} un\n` +
    `Se recomienda reponer stock.`
  )
}

function buildReminderMessage(product: { name: string; stock: number }): string {
  return (
    `🔁 Recordatorio de stock bajo\n` +
    `El producto '${product.name}' sigue con bajo stock.\n` +
    `Stock actual: ${product.stock} un\n` +
    `Revisar reposición.`
  )
}

export async function runStockAlertCheck(): Promise<void> {
  console.log('[StockAlert] Running stock alert check...')

  try {
    const products = await prisma.product.findMany({
      where: { active: true, minStock: { gt: 0 } },
      select: {
        id: true,
        name: true,
        stock: true,
        minStock: true,
        alertSent: true,
        alertSentAt: true,
      },
    })

    const now = new Date()
    const reminderThresholdMs = REMINDER_DAYS * 24 * 60 * 60 * 1000

    // Separate products into groups
    const lowStock = products.filter(p => Number(p.stock) <= Number(p.minStock))
    const backToNormal = products.filter(p => Number(p.stock) > Number(p.minStock) && p.alertSent)

    // 1. Reset alerts for products that recovered
    if (backToNormal.length > 0) {
      await prisma.product.updateMany({
        where: { id: { in: backToNormal.map(p => p.id) } },
        data: { alertSent: false, alertSentAt: null },
      })
      console.log(`[StockAlert] Reset alerts for ${backToNormal.length} product(s) back to normal stock`)
    }

    // 2. Process low-stock products
    for (const product of lowStock) {
      const stock = Number(product.stock)
      const minStock = Number(product.minStock)
      const info = { name: product.name, stock, minStock }

      if (!product.alertSent) {
        // First alert
        await sendWhatsApp(buildAlertMessage(info))
        await prisma.product.update({
          where: { id: product.id },
          data: { alertSent: true, alertSentAt: now },
        })
        console.log(`[StockAlert] First alert sent for "${product.name}"`)
      } else if (product.alertSentAt) {
        const msSinceAlert = now.getTime() - product.alertSentAt.getTime()
        if (msSinceAlert >= reminderThresholdMs) {
          // Reminder
          await sendWhatsApp(buildReminderMessage(info))
          await prisma.product.update({
            where: { id: product.id },
            data: { alertSentAt: now }, // reset timer, keep alertSent=true
          })
          console.log(`[StockAlert] Reminder sent for "${product.name}"`)
        }
      }
    }

    console.log(
      `[StockAlert] Check complete — ${lowStock.length} low-stock, ${backToNormal.length} recovered`,
    )
  } catch (err: any) {
    console.error(`[StockAlert] Check failed: ${err.message}`)
  }
}
