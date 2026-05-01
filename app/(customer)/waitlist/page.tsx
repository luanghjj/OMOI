'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const zoneOptions = [
  { value: '', label: 'Keine Präferenz' },
  { value: 'WINDOW', label: 'Fensterplatz' },
  { value: 'OUTDOOR', label: 'Außenbereich' },
  { value: 'QUIET', label: 'Ruhezone' },
  { value: 'WORKSPACE', label: 'Arbeitsplatz' },
  { value: 'BAR', label: 'Bar-Bereich' },
]

export default function WaitlistPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    phone: '',
    desiredDate: '',
    desiredTime: '10:00',
    guestCount: '2',
    zone: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Senden fehlgeschlagen')
        return
      }

      setSuccess(true)
    } catch {
      setError('Verbindungsfehler')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
        </div>
        <h1 className="text-2xl font-bold text-on-surface mb-2">Auf die Warteliste gesetzt!</h1>
        <p className="text-on-surface-variant mb-6">Wir benachrichtigen Sie, sobald ein passender Tisch frei wird.</p>
        <button
          onClick={() => router.push('/')}
          className="px-8 py-3 bg-primary-container text-white rounded-full font-semibold active:scale-95 transition-all"
        >
          Zur Startseite
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-on-surface mb-2">Warteliste</h1>
      <p className="text-on-surface-variant mb-8">
        Wenn kein passender Tisch verfügbar ist, hinterlassen Sie Ihre Daten und wir melden uns, sobald ein Platz frei wird.
      </p>

      {error && (
        <div className="bg-error-container text-on-error-container px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider block mb-2">Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3.5 text-on-surface focus:ring-2 focus:ring-on-primary-container"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider block mb-2">Telefon *</label>
          <input
            type="tel"
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+49 171 1234567"
            className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3.5 text-on-surface focus:ring-2 focus:ring-on-primary-container"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider block mb-2">Wunschdatum *</label>
            <input
              type="date"
              required
              value={form.desiredDate}
              onChange={(e) => setForm({ ...form, desiredDate: e.target.value })}
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3.5 text-on-surface focus:ring-2 focus:ring-on-primary-container"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider block mb-2">Wunschuhrzeit *</label>
            <input
              type="time"
              required
              value={form.desiredTime}
              onChange={(e) => setForm({ ...form, desiredTime: e.target.value })}
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3.5 text-on-surface focus:ring-2 focus:ring-on-primary-container"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider block mb-2">Gäste *</label>
            <select
              value={form.guestCount}
              onChange={(e) => setForm({ ...form, guestCount: e.target.value })}
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3.5 text-on-surface focus:ring-2 focus:ring-on-primary-container"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? 'Gast' : 'Gäste'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider block mb-2">Bereich</label>
            <select
              value={form.zone}
              onChange={(e) => setForm({ ...form, zone: e.target.value })}
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3.5 text-on-surface focus:ring-2 focus:ring-on-primary-container"
            >
              {zoneOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-primary-container text-white font-bold rounded-xl active:scale-95 transition-all shadow-lg disabled:opacity-50"
        >
          {submitting ? 'Wird gesendet...' : 'Auf Warteliste eintragen'}
        </button>
      </form>
    </div>
  )
}
