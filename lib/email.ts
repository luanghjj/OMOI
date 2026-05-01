import nodemailer from 'nodemailer'
import QRCode from 'qrcode'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASS,
  },
})

interface BookingEmailData {
  guestName: string
  guestEmail: string
  bookingCode: string
  date: string
  startTime: string
  endTime: string
  guestCount: number
  status: 'PENDING' | 'CONFIRMED'
  specialNote?: string
  firstTimePromo?: {
    type: 'PERCENT' | 'PRODUCT'
    percent?: number
    productName?: string
    message?: string
  } | null
  restaurantName?: string
  restaurantAddress?: string
  restaurantPhone?: string
}

const QR_CID = 'qr-code@omoi'

function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString('de-DE', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    })
  } catch { return isoDate }
}

// Build email using string concatenation to avoid nested backtick issues
async function buildEmail(data: BookingEmailData): Promise<{ html: string; qrBuffer: Buffer | null }> {
  const name = data.restaurantName || 'OMOI · 思い'
  const address = data.restaurantAddress || 'Hauptstätter Str. 57, 70178 Stuttgart'
  const confirmed = data.status === 'CONFIRMED'
  const statusLabel = confirmed ? '✅ Bestätigt' : '⏳ Wird geprüft'
  const statusColor = confirmed ? '#16a34a' : '#d97706'
  const statusBg = confirmed ? '#f0fdf4' : '#fffbeb'
  const statusBorder = confirmed ? '#bbf7d0' : '#fde68a'
  const greeting = confirmed
    ? 'Ihr Tisch wurde bestätigt. Wir freuen uns auf Ihren Besuch!'
    : 'Ihre Anfrage wird geprüft. Wir melden uns in Kürze.'

  const confirmUrl = (process.env.NEXTAUTH_URL || 'http://localhost:3000') + '/booking/confirm?code=' + data.bookingCode

  // Generate QR as Buffer → CID attachment (works in all email clients)
  let qrBuffer: Buffer | null = null
  try {
    qrBuffer = await QRCode.toBuffer(confirmUrl, {
      width: 240, margin: 2, color: { dark: '#3b1f0a', light: '#ffffff' },
      type: 'png',
    } as Parameters<typeof QRCode.toBuffer>[1])
  } catch { /* skip */ }

  // ── Sections ──────────────────────────────────────────────────────────────
  const noteSection = data.specialNote
    ? '<div style="margin:0 24px 16px;background:#fff8ee;border:1px solid #f0ddb8;border-radius:12px;padding:12px 16px;">'
      + '<p style="font-size:9px;font-weight:700;color:#a89070;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px;">Hinweise</p>'
      + '<p style="font-size:13px;color:#5a4020;margin:0;">' + data.specialNote + '</p>'
      + '</div>'
    : ''

  const qrSection = qrBuffer
    ? '<div style="margin:0 24px 20px;background:white;border:2px dashed #d4c4a8;border-radius:16px;padding:20px;text-align:center;">'
      + '<p style="font-size:9px;font-weight:700;color:#a89070;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px;">Ihr QR-Code</p>'
      + '<img src="cid:' + QR_CID + '" alt="QR Code" width="160" height="160" style="border-radius:10px;display:block;margin:0 auto;" />'
      + '<p style="font-size:11px;color:#a89070;margin:12px 0 0;line-height:1.4;">Zeigen Sie diesen Code dem Personal für schnellen Check-in.</p>'
      + '</div>'
    : '<div style="margin:0 24px 20px;text-align:center;">'
      + '<a href="' + confirmUrl + '" style="display:inline-block;padding:10px 24px;background:#3b1f0a;color:white;border-radius:12px;font-size:13px;font-weight:700;text-decoration:none;">📱 QR-Code ansehen</a>'
      + '</div>'

  let promoSection = ''
  if (data.firstTimePromo) {
    const promoText = data.firstTimePromo.type === 'PERCENT'
      ? (data.firstTimePromo.percent + '% Rabatt')
      : ('Gratis: ' + data.firstTimePromo.productName)
    promoSection = '<div style="margin:0 24px 20px;background:linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%);border:2px solid #6ee7b7;border-radius:16px;padding:20px;text-align:center;">'
      + '<p style="font-size:10px;color:#059669;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;">🎁 WILLKOMMEN BEI ' + name.toUpperCase() + '!</p>'
      + '<p style="font-size:22px;font-weight:800;color:#065f46;margin:0;">' + promoText + '</p>'
      + (data.firstTimePromo.message ? '<p style="font-size:13px;color:#047857;margin:6px 0 0;">' + data.firstTimePromo.message + '</p>' : '')
      + '<p style="font-size:10px;color:#34d399;margin:10px 0 0;">Zeigen Sie diese E-Mail beim Bezahlen.</p>'
      + '</div>'
  }

  const phoneRow = data.restaurantPhone
    ? '<p style="margin:4px 0;">📞 ' + data.restaurantPhone + '</p>'
    : ''

  // ── HTML ──────────────────────────────────────────────────────────────────
  const html = '<!DOCTYPE html>'
    + '<html lang="de">'
    + '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>'
    + '<body style="margin:0;padding:0;background-color:#f5f0e8;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">'
    + '<div style="max-width:480px;margin:0 auto;padding:32px 16px;">'

    // Header
    + '<div style="text-align:center;margin-bottom:20px;">'
    + '<h1 style="font-size:24px;font-weight:800;color:#3b1f0a;margin:0;">' + name + '</h1>'
    + '<p style="font-size:11px;color:#a89070;margin:4px 0 0;letter-spacing:2px;text-transform:uppercase;">Reservierungsbestätigung</p>'
    + '</div>'

    // Card
    + '<div style="background:#faf6f0;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(59,31,10,0.12);">'

    // Gold bar
    + '<div style="height:6px;background:linear-gradient(90deg,#8B6914,#C4975C,#8B6914);"></div>'

    // Greeting
    + '<div style="padding:24px 24px 16px;text-align:center;">'
    + '<p style="font-size:15px;color:#3b1f0a;margin:0;">Liebe/r <strong>' + data.guestName + '</strong>,</p>'
    + '<p style="font-size:13px;color:#8B7355;margin:6px 0 0;line-height:1.5;">' + greeting + '</p>'
    + '<div style="display:inline-block;margin-top:12px;padding:4px 16px;border-radius:20px;font-size:11px;font-weight:700;color:' + statusColor + ';background:' + statusBg + ';border:1px solid ' + statusBorder + ';">' + statusLabel + '</div>'
    + '</div>'

    // Booking code
    + '<div style="padding:0 24px 16px;text-align:center;">'
    + '<p style="font-size:9px;font-weight:700;color:#a89070;letter-spacing:3px;text-transform:uppercase;margin:0 0 4px;">Buchungscode</p>'
    + '<p style="font-size:28px;font-weight:900;color:#3b1f0a;letter-spacing:3px;margin:0;font-family:monospace;">' + data.bookingCode + '</p>'
    + '</div>'

    // Ticket divider
    + '<div style="position:relative;height:24px;overflow:hidden;">'
    + '<div style="position:absolute;left:-12px;top:50%;transform:translateY(-50%);width:24px;height:24px;background:#f5f0e8;border-radius:50%;"></div>'
    + '<div style="position:absolute;right:-12px;top:50%;transform:translateY(-50%);width:24px;height:24px;background:#f5f0e8;border-radius:50%;"></div>'
    + '<div style="margin:0 24px;border-top:2px dashed #d4c4a8;position:relative;top:50%;"></div>'
    + '</div>'

    // Details grid 2x2
    + '<div style="padding:16px 24px 20px;">'
    + '<table style="width:100%;border-collapse:collapse;">'
    + '<tr>'
    // Uhrzeit
    + '<td style="padding:8px 8px 8px 0;width:50%;vertical-align:top;">'
    + '<table cellpadding="0" cellspacing="0"><tr>'
    + '<td style="width:36px;vertical-align:top;"><div style="width:36px;height:36px;background:#f0e8d8;border-radius:10px;text-align:center;line-height:36px;font-size:18px;">🕐</div></td>'
    + '<td style="padding-left:10px;vertical-align:top;">'
    + '<p style="font-size:9px;font-weight:700;color:#a89070;letter-spacing:2px;text-transform:uppercase;margin:0;">Uhrzeit</p>'
    + '<p style="font-size:18px;font-weight:800;color:#3b1f0a;margin:2px 0 0;">' + data.startTime + ' Uhr</p>'
    + '</td></tr></table></td>'
    // Datum
    + '<td style="padding:8px 0 8px 8px;width:50%;vertical-align:top;">'
    + '<table cellpadding="0" cellspacing="0"><tr>'
    + '<td style="width:36px;vertical-align:top;"><div style="width:36px;height:36px;background:#f0e8d8;border-radius:10px;text-align:center;line-height:36px;font-size:18px;">📅</div></td>'
    + '<td style="padding-left:10px;vertical-align:top;">'
    + '<p style="font-size:9px;font-weight:700;color:#a89070;letter-spacing:2px;text-transform:uppercase;margin:0;">Datum</p>'
    + '<p style="font-size:13px;font-weight:700;color:#3b1f0a;margin:2px 0 0;line-height:1.3;">' + formatDate(data.date) + '</p>'
    + '</td></tr></table></td>'
    + '</tr><tr>'
    // Gäste
    + '<td style="padding:8px 8px 8px 0;width:50%;vertical-align:top;">'
    + '<table cellpadding="0" cellspacing="0"><tr>'
    + '<td style="width:36px;vertical-align:top;"><div style="width:36px;height:36px;background:#f0e8d8;border-radius:10px;text-align:center;line-height:36px;font-size:18px;">👥</div></td>'
    + '<td style="padding-left:10px;vertical-align:top;">'
    + '<p style="font-size:9px;font-weight:700;color:#a89070;letter-spacing:2px;text-transform:uppercase;margin:0;">Gäste</p>'
    + '<p style="font-size:18px;font-weight:800;color:#3b1f0a;margin:2px 0 0;">' + data.guestCount + ' ' + (data.guestCount === 1 ? 'Person' : 'Pers.') + '</p>'
    + '</td></tr></table></td>'
    // Standort
    + '<td style="padding:8px 0 8px 8px;width:50%;vertical-align:top;">'
    + '<table cellpadding="0" cellspacing="0"><tr>'
    + '<td style="width:36px;vertical-align:top;"><div style="width:36px;height:36px;background:#f0e8d8;border-radius:10px;text-align:center;line-height:36px;font-size:18px;">📍</div></td>'
    + '<td style="padding-left:10px;vertical-align:top;">'
    + '<p style="font-size:9px;font-weight:700;color:#a89070;letter-spacing:2px;text-transform:uppercase;margin:0;">Standort</p>'
    + '<p style="font-size:13px;font-weight:700;color:#3b1f0a;margin:2px 0 0;line-height:1.3;">' + address.split(',')[0] + '</p>'
    + '</td></tr></table></td>'
    + '</tr></table></div>'

    // Sections
    + noteSection
    + qrSection
    + promoSection

    // Logo
    + '<div style="text-align:center;padding:0 0 20px;">'
    + '<p style="font-size:13px;color:#c4b090;margin:0;font-weight:600;">' + name + '</p>'
    + '</div>'

    + '</div>' // card

    // Footer
    + '<div style="text-align:center;padding:20px 0;color:#c4b090;font-size:11px;">'
    + '<p style="margin:0;">' + address + '</p>'
    + phoneRow
    + '<p style="margin:10px 0 0;font-size:10px;color:#d6d3d1;">Diese E-Mail wurde automatisch generiert.</p>'
    + '</div>'

    + '</div></body></html>'

  return { html, qrBuffer }
}

export async function sendBookingConfirmation(data: BookingEmailData): Promise<boolean> {
  if (!process.env.NODEMAILER_USER || !process.env.NODEMAILER_PASS) {
    console.log('[Email] Skipped — NODEMAILER_USER/PASS not configured')
    return false
  }
  if (!data.guestEmail) {
    console.log('[Email] Skipped — no guest email')
    return false
  }

  try {
    const name = data.restaurantName || 'OMOI · 思い'
    const subject = data.status === 'CONFIRMED'
      ? '✅ Reservierung bestätigt — ' + formatDate(data.date) + ' um ' + data.startTime + ' | ' + name
      : '📋 Reservierung eingegangen — ' + formatDate(data.date) + ' um ' + data.startTime + ' | ' + name

    const { html, qrBuffer } = await buildEmail(data)

    await transporter.sendMail({
      from: '"' + name + '" <' + process.env.NODEMAILER_USER + '>',
      to: data.guestEmail,
      subject,
      html,
      attachments: qrBuffer ? [{
        filename: 'qr-code.png',
        content: qrBuffer,
        cid: QR_CID,
        contentType: 'image/png',
        contentDisposition: 'inline',
      }] : [],
    })

    console.log('[Email] Sent to ' + data.guestEmail + ' — ' + data.bookingCode)
    return true
  } catch (error) {
    console.error('[Email] Failed:', error)
    return false
  }
}
