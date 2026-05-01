'use client'

import { useState } from 'react'
import Link from 'next/link'

interface BookingHistory {
  bookingCode: string
  guestName: string
  date: string
  startTime: string
  endTime: string
  guestCount: number
  status: string
  specialNote: string | null
}

interface CustomerInfo {
  name: string
  phone: string
  email: string | null
  createdAt: string | null
  visitCount: number
  tier: 'NEUKUNDE' | 'STAMMKUNDE' | 'VIP'
}

const statusConfig: Record<string, { bg: string; label: string; icon: string }> = {
  PENDING:   { bg: 'bg-amber-100 text-amber-700 border-amber-200',    label: 'Ausstehend',  icon: 'schedule' },
  CONFIRMED: { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Bestätigt', icon: 'check_circle' },
  SEATED:    { bg: 'bg-blue-100 text-blue-700 border-blue-200',       label: 'Am Tisch',    icon: 'restaurant' },
  COMPLETED: { bg: 'bg-stone-100 text-stone-500 border-stone-200',    label: 'Abgeschlossen', icon: 'done_all' },
  CANCELLED: { bg: 'bg-red-100 text-red-600 border-red-200',          label: 'Storniert',   icon: 'cancel' },
  NO_SHOW:   { bg: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Nicht erschienen', icon: 'person_off' },
}

const tierConfig = {
  NEUKUNDE:   { icon: '🆕', label: 'Neukunde',   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  STAMMKUNDE: { icon: '⭐', label: 'Stammkunde', color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
  VIP:        { icon: '🏆', label: 'VIP-Kunde',  color: 'text-purple-700',  bg: 'bg-purple-50 border-purple-200' },
}

export default function AccountPage() {
  const [searchType, setSearchType] = useState<'phone' | 'email'>('phone')
  const [searchValue, setSearchValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [customer, setCustomer] = useState<CustomerInfo | null>(null)
  const [bookings, setBookings] = useState<BookingHistory[]>([])
  const [error, setError] = useState('')

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchValue.trim()) return

    setLoading(true)
    setError('')
    setSearched(false)
    try {
      const params = new URLSearchParams()
      if (searchType === 'phone') {
        params.set('phone', searchValue.trim())
      } else {
        params.set('email', searchValue.trim())
      }

      const res = await fetch(`/api/customers/lookup?${params.toString()}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Fehler bei der Suche')
        return
      }

      setSearched(true)
      if (data.found) {
        setCustomer(data.customer)
        setBookings(data.bookings || [])
      } else {
        setCustomer(null)
        setBookings([])
      }
    } catch {
      setError('Verbindungsfehler')
    } finally {
      setLoading(false)
    }
  }

  const upcoming = bookings.filter(b => {
    const bookingDate = b.date.split('T')[0]
    const today = new Date().toISOString().split('T')[0]
    return bookingDate >= today && ['PENDING', 'CONFIRMED', 'SEATED'].includes(b.status)
  })

  const past = bookings.filter(b => {
    const bookingDate = b.date.split('T')[0]
    const today = new Date().toISOString().split('T')[0]
    return bookingDate < today || ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(b.status)
  })

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">

      {/* Header */}
      <div className="text-center">
        <span className="material-symbols-outlined text-4xl text-primary-container mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
        <h1 className="text-xl font-bold text-on-surface">Buchungsverlauf</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Geben Sie Ihre Telefonnummer oder E-Mail ein, um Ihre Reservierungen zu sehen.
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-3">
        {/* Type toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setSearchType('phone'); setSearchValue(''); setSearched(false) }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 border ${
              searchType === 'phone'
                ? 'border-primary-container bg-primary-container/10 text-primary-container'
                : 'border-stone-200 bg-white text-stone-500'
            }`}
          >
            <span className="material-symbols-outlined text-base">call</span>
            Telefon
          </button>
          <button
            type="button"
            onClick={() => { setSearchType('email'); setSearchValue(''); setSearched(false) }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 border ${
              searchType === 'email'
                ? 'border-primary-container bg-primary-container/10 text-primary-container'
                : 'border-stone-200 bg-white text-stone-500'
            }`}
          >
            <span className="material-symbols-outlined text-base">mail</span>
            E-Mail
          </button>
        </div>

        {/* Input + submit */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-lg">
              {searchType === 'phone' ? 'call' : 'mail'}
            </span>
            <input
              type={searchType === 'phone' ? 'tel' : 'email'}
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              placeholder={searchType === 'phone' ? '+49 171 1234567' : 'email@example.com'}
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low rounded-xl text-sm text-on-surface focus:ring-2 focus:ring-primary-container border-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !searchValue.trim()}
            className="px-5 py-3 bg-primary-container text-white rounded-xl font-bold text-sm active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-lg">search</span>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            {error}
          </div>
        )}
      </form>

      {/* Results */}
      {searched && !customer && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="material-symbols-outlined text-5xl text-stone-200 mb-3">search_off</span>
          <p className="font-semibold text-on-surface">Keine Reservierungen gefunden</p>
          <p className="text-sm text-on-surface-variant mt-1">
            Für {searchType === 'phone' ? 'diese Telefonnummer' : 'diese E-Mail-Adresse'} liegen keine Buchungen vor.
          </p>
          <Link
            href="/booking"
            className="mt-4 px-5 py-2.5 bg-primary-container text-white rounded-xl text-sm font-bold active:scale-95 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Jetzt reservieren
          </Link>
        </div>
      )}

      {customer && (
        <>
          {/* Customer card */}
          <div className={`rounded-2xl border p-4 ${tierConfig[customer.tier].bg}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm">
                  {tierConfig[customer.tier].icon}
                </div>
                <div>
                  <p className="font-bold text-on-surface">{customer.name}</p>
                  <p className={`text-xs font-bold ${tierConfig[customer.tier].color}`}>
                    {tierConfig[customer.tier].label}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-on-surface">{customer.visitCount}</p>
                <p className="text-[10px] text-on-surface-variant font-semibold uppercase">Besuche</p>
              </div>
            </div>
            {customer.createdAt && (
              <p className="text-[10px] text-stone-500 mt-3 pt-2 border-t border-stone-200/50">
                Kunde seit {new Date(customer.createdAt).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>

          {/* Upcoming bookings */}
          {upcoming.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-emerald-500 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>event_upcoming</span>
                <h2 className="text-sm font-bold text-on-surface">Kommende Reservierungen</h2>
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">{upcoming.length}</span>
              </div>
              <div className="space-y-3">
                {upcoming.map(b => {
                  const cfg = statusConfig[b.status] || statusConfig.PENDING
                  return (
                    <Link key={b.bookingCode} href={`/booking/confirm?code=${b.bookingCode}`}
                      className="block bg-white rounded-2xl border border-stone-200 p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.99]">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-on-surface">
                            {new Date(b.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                          </p>
                          <p className="text-sm text-on-surface-variant mt-0.5">{b.startTime} – {b.endTime} Uhr</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.bg}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-stone-100 text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">group</span>
                          {b.guestCount} Gäste
                        </span>
                        <span className="font-mono text-stone-400">{b.bookingCode}</span>
                        {b.specialNote && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">sticky_note_2</span>
                            Notiz
                          </span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Past bookings */}
          {past.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-stone-400 text-lg">history</span>
                <h2 className="text-sm font-bold text-on-surface">Vergangene Reservierungen</h2>
                <span className="px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded text-[10px] font-bold">{past.length}</span>
              </div>
              <div className="space-y-2">
                {past.map(b => {
                  const cfg = statusConfig[b.status] || statusConfig.COMPLETED
                  return (
                    <div key={b.bookingCode} className="bg-stone-50 rounded-xl border border-stone-100 px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-on-surface">
                          {new Date(b.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          <span className="text-stone-400 font-normal"> · {b.startTime}</span>
                        </p>
                        <p className="text-xs text-stone-400 mt-0.5">{b.guestCount} Gäste · {b.bookingCode}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${cfg.bg}`}>
                        {cfg.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {bookings.length === 0 && (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-3xl text-stone-200 mb-2">event_busy</span>
              <p className="text-sm text-on-surface-variant">Noch keine Reservierungen</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
