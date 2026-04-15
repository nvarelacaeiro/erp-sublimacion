import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

interface SendRequisitionNotificationParams {
  to: string[]
  requisitionNumber: number
  requisitionTitle: string
  requesterName: string
  appUrl: string
}

export async function sendRequisitionSubmittedEmail({
  to,
  requisitionNumber,
  requisitionTitle,
  requesterName,
  appUrl,
}: SendRequisitionNotificationParams): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || to.length === 0) return

  const link = `${appUrl}/requisitions`

  await transporter.sendMail({
    from: `"Sistema ERP" <${process.env.SMTP_USER}>`,
    to: to.join(', '),
    subject: `Nueva solicitud de compra #${requisitionNumber} pendiente de aprobación`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1e293b;">
        <h2 style="margin: 0 0 16px; font-size: 18px;">Nueva solicitud pendiente</h2>
        <p style="margin: 0 0 8px; color: #475569;">
          <strong>${requesterName}</strong> envió una solicitud de compra para su aprobación.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
          <tr>
            <td style="padding: 8px 12px; background: #f8fafc; border-radius: 6px 6px 0 0; color: #64748b; width: 40%;">Número</td>
            <td style="padding: 8px 12px; background: #f8fafc; border-radius: 6px 6px 0 0; font-weight: 600;">#${requisitionNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f1f5f9; color: #64748b;">Descripción</td>
            <td style="padding: 8px 12px; background: #f1f5f9;">${requisitionTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f8fafc; color: #64748b;">Solicitado por</td>
            <td style="padding: 8px 12px; background: #f8fafc;">${requesterName}</td>
          </tr>
        </table>
        <a href="${link}" style="display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          Ver solicitud →
        </a>
        <p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8;">
          Este mensaje fue enviado automáticamente por el sistema ERP.
        </p>
      </div>
    `,
  })
}
