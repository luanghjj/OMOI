'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import BookingQR from '@/components/customer/BookingQR'

interface Booking {
  bookingCode: string
  guestName: string
  guestPhone: string
  guestCount: number
  date: string
  startTime: string
  endTime: string
  specialNote: string | null
  table: { number: number; name: string; zone: string } | null
  assignedTables?: Array<{ table: { number: number; name: string; zone: string } }>
  preOrders: Array<{ quantity: number; menuItem: { name: string; price: number } }>
}

interface SiteSettings {
  restaurantName?: string
  restaurantAddress?: string
  restaurantPhone?: string
}

function ConfirmContent() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const promoType = searchParams.get('promoType')
  const promoPercent = searchParams.get('promoPercent')
  const promoProduct = searchParams.get('promoProduct')
  const promoMessage = searchParams.get('promoMessage')
  const isFirstTime = searchParams.get('isFirstTime') === 'true'
  const [booking, setBooking] = useState<Booking | null>(null)
  const [site, setSite] = useState<SiteSettings>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (code) fetchBooking(code)
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.settings) setSite(d.settings)
    }).catch(() => {})
  }, [code])

  async function fetchBooking(bookingCode: string) {
    try {
      const res = await fetch(`/api/bookings/${bookingCode}`)
      const data = await res.json()
      setBooking(data.booking)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
    })
  }

  function formatDateShort(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      weekday: 'short', day: '2-digit', month: '2-digit',
    })
  }

  function generateICS() {
    if (!booking) return
    const date = new Date(booking.date)
    const [sh, sm] = booking.startTime.split(':').map(Number)
    const [eh, em] = booking.endTime.split(':').map(Number)
    const start = new Date(date); start.setHours(sh, sm, 0)
    const end = new Date(date); end.setHours(eh, em, 0)
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    const name = site.restaurantName || 'OMOI'
    const addr = site.restaurantAddress || 'Hauptstätter Str. 57, 70178 Stuttgart'

    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${fmt(start)}
DTEND:${fmt(end)}
SUMMARY:Reservierung ${name} - ${booking.bookingCode}
DESCRIPTION:${booking.guestCount} Gäste
LOCATION:${addr}
END:VEVENT
END:VCALENDAR`
    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `omoi-${booking.bookingCode}.ics`; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-20 h-20 skeleton rounded-full" />
    </div>
  )

  if (!booking) return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <span className="material-symbols-outlined text-5xl text-stone-300 mb-4">event_busy</span>
        <p className="text-on-surface-variant text-lg">Reservierung nicht gefunden</p>
        <Link href="/" className="text-primary-container font-semibold mt-4 inline-block">Zur Startseite</Link>
      </div>
    </div>
  )

  const preOrderTotal = booking.preOrders.reduce((sum, po) => sum + po.menuItem.price * po.quantity, 0)
  const restaurantName = site.restaurantName || 'OMOI · 思い'
  const restaurantAddress = site.restaurantAddress || 'Hauptstätter Str. 57, 70178 Stuttgart'

  return (
    <main className="min-h-screen flex flex-col items-center justify-start px-4 py-8 max-w-md mx-auto">

      {/* ── Ticket Card ─────────────────────────────────────── */}
      <div className="w-full relative">

        {/* Top gradient bar */}
        <div className="h-3 bg-gradient-to-r from-[#8B6914] via-[#C4975C] to-[#8B6914] rounded-t-3xl" />

        {/* Main card */}
        <div className="w-full bg-[#faf6f0] rounded-b-3xl shadow-[0_20px_60px_rgba(33,11,0,0.12)] overflow-hidden">

          {/* Header — Code */}
          <div className="px-6 pt-6 pb-5">
            <p className="text-[10px] font-bold text-[#a89070] uppercase tracking-[3px] mb-1">Buchungscode</p>
            <p className="text-3xl font-black text-[#3b1f0a] tracking-wider">{booking.bookingCode}</p>
          </div>

          {/* Divider with cutouts */}
          <div className="relative flex items-center px-6">
            <div className="absolute -left-3 w-6 h-6 bg-white rounded-full" />
            <div className="flex-1 border-t-2 border-dashed border-[#d4c4a8]" />
            <div className="absolute -right-3 w-6 h-6 bg-white rounded-full" />
          </div>

          {/* Info grid */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-2 gap-5">

              {/* Zeit */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#f0e8d8] rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#8B6914] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#a89070] uppercase tracking-wider">Uhrzeit</p>
                  <p className="text-lg font-bold text-[#3b1f0a]">{booking.startTime} Uhr</p>
                </div>
              </div>

              {/* Datum */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#f0e8d8] rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#8B6914] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#a89070] uppercase tracking-wider">Datum</p>
                  <p className="text-sm font-bold text-[#3b1f0a] leading-snug">{formatDate(booking.date)}</p>
                </div>
              </div>

              {/* Gäste */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#f0e8d8] rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#8B6914] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#a89070] uppercase tracking-wider">Gäste</p>
                  <p className="text-lg font-bold text-[#3b1f0a]">{booking.guestCount} {booking.guestCount === 1 ? 'Person' : 'Personen'}</p>
                </div>
              </div>

              {/* Standort */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#f0e8d8] rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#8B6914] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#a89070] uppercase tracking-wider">Standort</p>
                  <p className="text-sm font-bold text-[#3b1f0a] leading-snug">{restaurantAddress.split(',')[0]}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pre-orders */}
          {booking.preOrders.length > 0 && (
            <div className="mx-6 mb-5 bg-white/70 rounded-2xl p-4 border border-[#e8dcc8]">
              <p className="text-[10px] font-bold text-[#a89070] uppercase tracking-[2px] mb-2">Vorbestellung</p>
              {booking.preOrders.map((po, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span className="text-[#3b1f0a]">{po.quantity}× {po.menuItem.name}</span>
                  <span className="font-bold text-[#8B6914]">
                    {(po.menuItem.price * po.quantity / 100).toFixed(2)} €
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-2 mt-1 border-t border-[#e8dcc8] font-bold">
                <span className="text-[#3b1f0a]">Gesamt</span>
                <span className="text-[#8B6914]">{(preOrderTotal / 100).toFixed(2)} €</span>
              </div>
            </div>
          )}

          {/* Special note */}
          {booking.specialNote && (
            <div className="mx-6 mb-5 bg-[#fff8ee] rounded-2xl p-4 border border-[#f0ddb8]">
              <p className="text-[10px] font-bold text-[#a89070] uppercase tracking-[2px] mb-1">Hinweise</p>
              <p className="text-sm text-[#5a4020]">{booking.specialNote}</p>
            </div>
          )}

          {/* QR Code */}
          <div className="mx-6 mb-6 bg-white rounded-2xl p-6 border-2 border-dashed border-[#d4c4a8] flex flex-col items-center">
            <p className="text-[10px] font-bold text-[#a89070] uppercase tracking-[3px] mb-4">Ihr QR-Code</p>
            <BookingQR code={booking.bookingCode} />
            <p className="text-xs text-[#a89070] text-center mt-4 max-w-[220px] leading-relaxed">
              Zeigen Sie diesen QR-Code dem Personal, um Ihren Tisch schnell zu erhalten.
            </p>
          </div>

          {/* First-time promo voucher */}
          {isFirstTime && promoType && (
            <div className="mx-6 mb-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 rounded-2xl border-2 border-emerald-300 p-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(16,185,129,0.08),transparent_50%)]" />
              <div className="relative">
                <span className="material-symbols-outlined text-3xl text-emerald-500 mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>redeem</span>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-[2px] mb-2">Willkommen bei {restaurantName}!</p>
                <p className="text-xl font-black text-emerald-800">
                  {promoType === 'PERCENT' ? `${promoPercent}% Rabatt` : `Gratis: ${promoProduct}`}
                </p>
                {promoMessage && <p className="text-sm text-emerald-600 mt-2 max-w-xs mx-auto">{promoMessage}</p>}
                <div className="mt-3 pt-2 border-t border-emerald-200">
                  <p className="text-[9px] text-emerald-500 font-semibold uppercase tracking-wider">Zeigen Sie diese Seite beim Bezahlen</p>
                </div>
              </div>
            </div>
          )}

          {/* Bottom logo */}
          <div className="flex items-center justify-center pb-6">
            <img src="/images/omoi-logo.png" alt="OMOI" className="h-5 object-contain opacity-40" />
          </div>
        </div>
      </div>

      {/* ── Action Buttons ──────────────────────────────────── */}
      <div className="w-full flex flex-col gap-3 mt-8">
        <button onClick={generateICS}
          className="w-full py-4 bg-[#3b1f0a] text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg text-sm">
          <span className="material-symbols-outlined text-lg">event</span>
          Zum Kalender hinzufügen
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button className="py-3.5 bg-[#f0e8d8] text-[#3b1f0a] rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all text-sm">
            <span className="material-symbols-outlined text-lg">share</span>
            Teilen
          </button>
          <Link href="/"
            className="py-3.5 border-2 border-[#d4c4a8] text-[#3b1f0a] rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all text-sm">
            <span className="material-symbols-outlined text-lg">home</span>
            Startseite
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full mt-10 text-center pb-4">
        <p className="text-[11px] text-[#c4b090]">{restaurantName}</p>
        <p className="text-[11px] text-[#c4b090]">{restaurantAddress}</p>
        {site.restaurantPhone && <p className="text-[11px] text-[#c4b090]">📞 {site.restaurantPhone}</p>}
      </footer>
    </main>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-20 h-20 skeleton rounded-full" />
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  )
}
