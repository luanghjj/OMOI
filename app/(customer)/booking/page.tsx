'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BookingPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [today, setToday] = useState('')

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    guestCount: '2',
    date: '',
    time: '10:00',
    specialNote: '',
  })

  const [slotDuration, setSlotDuration] = useState(30)
  const [openHours, setOpenHours] = useState({ openTuFr: '10:00', closeTuFr: '20:00', openSaSo: '11:00', closeSaSo: '22:00' })
  const [blockedSlots, setBlockedSlots] = useState<Array<{date: string; dayOfWeek: number|null; startTime: string; endTime: string}>>([])
  const [privacyAccepted, setPrivacyAccepted] = useState(false)

  useEffect(() => {
    const now = new Date()
    setToday(now.toISOString().split('T')[0])
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (tomorrow.getDay() === 1) tomorrow.setDate(tomorrow.getDate() + 1)
    setForm((prev) => ({ ...prev, date: tomorrow.toISOString().split('T')[0] }))

    // Load settings
    Promise.all([
      fetch('/api/settings').then(r => r.json()).catch(() => ({})),
      fetch('/api/blocked-times').then(r => r.json()).catch(() => ({})),
    ]).then(([s, b]) => {
      if (s.settings?.slotDuration) setSlotDuration(s.settings.slotDuration)
      if (s.settings) {
        setOpenHours({
          openTuFr: s.settings.openTuFr || '08:00',
          closeTuFr: s.settings.closeTuFr || '18:00',
          openSaSo: s.settings.openSaSo || '09:00',
          closeSaSo: s.settings.closeSaSo || '18:00',
        })
      }
      if (b.blockedSlots) setBlockedSlots(b.blockedSlots)
    })
  }, [])

  function isBlocked(date: string, time: string): boolean {
    const dow = new Date(date).getDay()
    return blockedSlots.some(slot => {
      const matchDate = slot.date === date || slot.date === '*'
      const matchDow  = slot.dayOfWeek !== null && slot.dayOfWeek === dow
      if (!matchDate && !matchDow) return false
      return time >= slot.startTime && time < slot.endTime
    })
  }

  function getTimeOptions(): string[] {
    if (!form.date) return []
    const day = new Date(form.date).getDay()
    if (day === 1) return [] // Monday closed

    // Use dynamic open/close hours from settings
    const isWeekend = day === 0 || day === 6
    const openTime = isWeekend ? openHours.openSaSo : openHours.openTuFr
    const closeTime = isWeekend ? openHours.closeSaSo : openHours.closeTuFr

    const [openH, openM] = openTime.split(':').map(Number)
    const [closeH, closeM] = closeTime.split(':').map(Number)
    const startMin = openH * 60 + openM
    const endMin = closeH * 60 + closeM

    const slots: string[] = []
    for (let cur = startMin; cur < endMin; cur += slotDuration) {
      const h = Math.floor(cur / 60)
      const m = cur % 60
      const t = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      if (!isBlocked(form.date, t)) slots.push(t)
    }
    return slots
  }

  function validate(): boolean {
    if (!form.name.trim()) { setError('Bitte geben Sie Ihren Namen ein'); return false }
    if (!/^[\d+\s()\-]{7,}$/.test(form.phone)) { setError('Ungültige Telefonnummer'); return false }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('Bitte geben Sie eine gültige E-Mail-Adresse ein'); return false }
    if (!form.date) { setError('Bitte wählen Sie ein Datum'); return false }
    if (!form.time) { setError('Bitte wählen Sie eine Uhrzeit'); return false }
    if (new Date(form.date).getDay() === 1) { setError('OMOI ist montags geschlossen'); return false }
    setError('')
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          time: form.time,
          guestCount: parseInt(form.guestCount),
          name: form.name,
          phone: form.phone,
          email: form.email,
          specialNote: form.specialNote || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Reservierung fehlgeschlagen'); return }

      // Build confirm URL with promo params
      const confirmParams = new URLSearchParams({ code: data.bookingCode })
      if (data.isFirstTime) confirmParams.set('isFirstTime', 'true')
      if (data.firstTimePromo) {
        confirmParams.set('promoType', data.firstTimePromo.type)
        if (data.firstTimePromo.type === 'PERCENT') confirmParams.set('promoPercent', String(data.firstTimePromo.percent))
        if (data.firstTimePromo.type === 'PRODUCT') confirmParams.set('promoProduct', data.firstTimePromo.productName)
        if (data.firstTimePromo.message) confirmParams.set('promoMessage', data.firstTimePromo.message)
      }
      router.push(`/booking/confirm?${confirmParams.toString()}`)
    } catch {
      setError('Verbindungsfehler, bitte erneut versuchen')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-background">
      {/* Hero */}
      <div className="relative h-44 overflow-hidden">
        <img
          src="/images/hero-cafe.jpg"
          alt="OMOI Cafe"
          className="w-full h-full object-cover"
          style={{ objectPosition: 'center 40%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/70 flex flex-col items-center justify-center text-center px-4">
          <img src="/images/omoi-logo.png" alt="OMOI" className="h-7 object-contain invert brightness-200 mb-2" />
          <h1 className="text-white text-xl font-bold">Tisch reservieren</h1>
          <p className="text-white/75 text-xs mt-1">Hauptstätter Str. 57 · Stuttgart</p>
        </div>
      </div>

      {/* Form — no negative margin card, just flat section */}
      <div className="px-4 py-6 pb-28 space-y-4 max-w-lg mx-auto">

        {/* Error */}
        {error && (
          <div className="bg-error-container text-on-error-container px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">
            Name *
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-primary-container text-[20px]">person</span>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Max Mustermann"
              className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low border-none rounded-xl text-on-surface text-sm focus:ring-2 focus:ring-on-primary-container"
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">
            Telefon *
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-primary-container text-[20px]">call</span>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+49 171 1234567"
              className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low border-none rounded-xl text-on-surface text-sm focus:ring-2 focus:ring-on-primary-container"
            />
          </div>
        </div>

        {/* Email — required */}
        <div>
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">
            E-Mail *
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-primary-container text-[20px]">mail</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@example.com"
              className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low border-none rounded-xl text-on-surface text-sm focus:ring-2 focus:ring-on-primary-container"
            />
          </div>
        </div>

        {/* Date + Guests */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Datum *</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-primary-container text-[18px]">calendar_today</span>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value, time: '10:00' })}
                min={today}
                className="w-full pl-10 pr-2 py-3.5 bg-surface-container-low border-none rounded-xl text-on-surface text-sm focus:ring-2 focus:ring-on-primary-container"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Gäste *</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-primary-container text-[18px]">group</span>
              <select
                value={form.guestCount}
                onChange={(e) => setForm({ ...form, guestCount: e.target.value })}
                className="w-full pl-10 pr-3 py-3.5 bg-surface-container-low border-none rounded-xl text-on-surface text-sm focus:ring-2 focus:ring-on-primary-container appearance-none"
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? 'Gast' : 'Gäste'}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Time */}
        <div>
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Uhrzeit *</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-primary-container text-[20px]">schedule</span>
            <select
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low border-none rounded-xl text-on-surface text-sm focus:ring-2 focus:ring-on-primary-container appearance-none"
            >
              {getTimeOptions().length === 0 ? (
                <option>Bitte zuerst Datum wählen</option>
              ) : (
                getTimeOptions().map((t) => (
                  <option key={t} value={t}>{t} Uhr</option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Special note */}
        <div>
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Besondere Wünsche</label>
          <textarea
            value={form.specialNote}
            onChange={(e) => setForm({ ...form, specialNote: e.target.value })}
            placeholder="z.B. Geburtstag, Kinderstuhl, Allergie..."
            rows={2}
            className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface text-sm focus:ring-2 focus:ring-on-primary-container resize-none"
          />
        </div>

        {/* Öffnungszeiten info */}
        <div className="bg-secondary-container/40 rounded-xl px-4 py-3 flex gap-3 items-start">
          <span className="material-symbols-outlined text-on-secondary-container text-[18px] mt-0.5">info</span>
          <div className="text-xs text-on-secondary-container">
            <p className="font-semibold mb-0.5">Öffnungszeiten</p>
            <p>Di–Do: 10:00–20:00 · Fr: 10:00–22:00</p>
            <p>Sa: 11:00–22:00 · So: 11:00–19:00</p>
            <p className="text-error font-medium mt-0.5">Montag: Ruhetag</p>
          </div>
        </div>

        {/* Privacy consent */}
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={privacyAccepted}
            onChange={e => setPrivacyAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-stone-300 text-[#3b1f0a] focus:ring-[#C4975C] cursor-pointer accent-[#3b1f0a]"
          />
          <span className="text-xs text-stone-500 leading-relaxed">
            Ich stimme der{' '}
            <a href="/datenschutz" target="_blank" className="text-[#C4975C] font-semibold underline underline-offset-2">Datenschutzerklärung</a>{' '}
            zu und bin damit einverstanden, dass meine Daten zur Bearbeitung meiner Reservierung verarbeitet werden. *
          </span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={submitting || !privacyAccepted}
          className={`w-full py-4 font-bold rounded-xl text-base transition-all shadow-lg flex items-center justify-center gap-2 ${
            privacyAccepted
              ? 'bg-primary-container text-white active:scale-95'
              : 'bg-stone-200 text-stone-400 cursor-not-allowed'
          }`}
        >
          {submitting ? (
            <>
              <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
              Wird gesendet...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-xl">event_available</span>
              Jetzt reservieren
            </>
          )}
        </button>
      </div>
    </div>
  )
}
