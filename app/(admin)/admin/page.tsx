'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Booking {
  id: string
  bookingCode: string
  guestName: string
  guestPhone: string
  guestCount: number
  date: string
  startTime: string
  endTime: string
  status: string
  specialNote: string | null
  table: { number: number; zone: string } | null
  assignedTables?: Array<{ table: { number: number; zone: string } }>
}

const statusColors: Record<string, string> = {
  PENDING:   'bg-amber-100 text-amber-700 border border-amber-200',
  CONFIRMED: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  SEATED:    'bg-blue-100 text-blue-700 border border-blue-200',
  COMPLETED: 'bg-stone-100 text-stone-500 border border-stone-200',
  CANCELLED: 'bg-red-100 text-red-600 border border-red-200',
  NO_SHOW:   'bg-purple-100 text-purple-700 border border-purple-200',
}
const statusLabels: Record<string, string> = {
  PENDING:   'Ausstehend',
  CONFIRMED: 'Bestätigt',
  SEATED:    'Am Tisch',
  COMPLETED: 'Fertig',
  CANCELLED: 'Storniert',
  NO_SHOW:   'No-show',
}
const zoneLabels: Record<string, string> = {
  WINDOW: 'Fenster', OUTDOOR: 'Außen', QUIET: 'Ruhezone',
  WORKSPACE: 'Arbeitsplatz', BAR: 'Bar',
}

function getAssignedTables(booking: Booking) {
  const assigned = booking.assignedTables?.map((item) => item.table) || []
  return assigned.length > 0 ? assigned : booking.table ? [booking.table] : []
}

function hasTableAssignment(booking: Booking) {
  return getAssignedTables(booking).length > 0
}

function tableLabel(booking: Booking) {
  const assigned = getAssignedTables(booking)
  if (assigned.length === 0) return 'Kein Tisch zugewiesen'
  return assigned.map((table) => `Tisch ${table.number}`).join(', ')
}

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([])
  const [loading, setLoading]   = useState(true)
  const [todayStr, setTodayStr] = useState('')
  const [nowStr, setNowStr]     = useState('')
  const [stats, setStats]       = useState({
    totalToday: 0,
    unassigned: 0,
    upcomingHour: 0,
    waitlistCount: 0,
  })
  const [hourlyStats, setHourlyStats] = useState<{
    today: { hour: string; count: number; guests: number }[]
    quietSlots: { day: number; dayLabel: string; hour: string; avg: number }[]
  }>({ today: [], quietSlots: [] })

  useEffect(() => {
    const now = new Date()
    setTodayStr(now.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }))
    setNowStr(now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))
    fetchDashboard()

    // Refresh every 60s
    const interval = setInterval(fetchDashboard, 60000)
    return () => clearInterval(interval)
  }, [])

  async function fetchDashboard() {
    try {
      const today = new Date().toISOString().split('T')[0]
      const [bookingsRes, waitlistRes, upcomingRes, hourlyRes] = await Promise.all([
        fetch(`/api/bookings?date=${today}`),
        fetch('/api/waitlist?status=WAITING'),
        fetch('/api/bookings'),
        fetch('/api/stats/hourly').then(r => r.json()).catch(() => ({ today: [], quietSlots: [] })),
      ])

      const bookingsData  = await bookingsRes.json()
      const waitlistData  = await waitlistRes.json()
      const upcomingData  = await upcomingRes.json()
      const todayBookings: Booking[] = bookingsData.bookings || []
      const allBookings: Booking[] = upcomingData.bookings || []
      setBookings(todayBookings)
      setUpcomingBookings(
        allBookings
          .filter((b) => {
            const bookingDate = b.date.split('T')[0]
            return bookingDate >= today && ['PENDING','CONFIRMED','SEATED'].includes(b.status)
          })
          .slice(0, 8)
      )

      const now       = new Date()
      const nowTime   = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
      const laterTime = `${String(now.getHours() + 1).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

      setStats({
        totalToday:    todayBookings.filter(b => b.status !== 'CANCELLED').length,
        unassigned:    todayBookings.filter(b => !hasTableAssignment(b) && !['CANCELLED','NO_SHOW'].includes(b.status)).length,
        upcomingHour:  todayBookings.filter(b => b.startTime >= nowTime && b.startTime <= laterTime && ['CONFIRMED','PENDING'].includes(b.status)).length,
        waitlistCount: (waitlistData.entries || []).length,
      })
      setHourlyStats(hourlyRes)
    } catch (e) {
      console.error('Dashboard fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function quickStatus(code: string, status: string) {
    await fetch(`/api/bookings/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchDashboard()
  }

  const active    = bookings.filter(b => ['PENDING','CONFIRMED','SEATED'].includes(b.status))
  const unassigned = bookings.filter(b => !hasTableAssignment(b) && !['CANCELLED','NO_SHOW'].includes(b.status))
  const showingUpcoming = active.length === 0 && upcomingBookings.length > 0
  const feedBookings = showingUpcoming ? upcomingBookings : active

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Tagesübersicht</h1>
          <p className="text-sm text-on-surface-variant mt-0.5 capitalize">{todayStr}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-on-surface-variant">Aktualisiert: {nowStr}</span>
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Aktualisieren
          </button>
          <Link
            href="/admin/bookings"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-container text-white rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Neue Reservierung
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Reservierungen heute',
            value: loading ? '–' : stats.totalToday,
            icon: 'book_online',
            bg: 'bg-[#3b1f0a]/5',
            text: 'text-[#3b1f0a]',
            href: '/admin/bookings',
          },
          {
            label: 'Ohne Tisch',
            value: loading ? '–' : stats.unassigned,
            icon: 'warning',
            bg: stats.unassigned > 0 ? 'bg-amber-100' : 'bg-stone-100',
            text: stats.unassigned > 0 ? 'text-amber-700' : 'text-stone-500',
            href: '/admin/bookings',
            alert: stats.unassigned > 0,
          },
          {
            label: 'Gäste in 1 Std.',
            value: loading ? '–' : stats.upcomingHour,
            icon: 'schedule',
            bg: 'bg-blue-50',
            text: 'text-blue-700',
            href: '/admin/bookings',
          },
          {
            label: 'Warteliste',
            value: loading ? '–' : stats.waitlistCount,
            icon: 'group_add',
            bg: 'bg-purple-50',
            text: 'text-purple-700',
            href: '/admin/waitlist',
          },
        ].map((card) => (
          <Link key={card.label} href={card.href}>
            <div className={`relative bg-white rounded-2xl border p-5 flex flex-col gap-3 hover:shadow-md transition-all cursor-pointer ${card.alert ? 'border-amber-300 shadow-amber-100 shadow-sm' : 'border-stone-100'}`}>
              {card.alert && (
                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" />
              )}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.bg}`}>
                <span className={`material-symbols-outlined text-[18px] ${card.text}`} style={{ fontVariationSettings: card.alert ? "'FILL' 1" : "'FILL' 0" }}>
                  {card.icon}
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold text-on-surface">{card.value}</p>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">{card.label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Stoßzeiten + Ruhige Zeiten ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today Peak Hours */}
        {hourlyStats.today.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-50 flex items-center gap-3">
              <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-red-500 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
              </div>
              <div>
                <p className="font-bold text-on-surface text-sm">Stoßzeiten heute</p>
                <p className="text-[11px] text-on-surface-variant">Buchungen pro Stunde</p>
              </div>
            </div>
            <div className="px-5 py-3 space-y-2">
              {hourlyStats.today.map(slot => {
                const maxCount = Math.max(...hourlyStats.today.map(s => s.count), 1)
                const pct = Math.round((slot.count / maxCount) * 100)
                const isPeak = slot.count >= 3
                return (
                  <div key={slot.hour} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-stone-500 w-12 shrink-0">{slot.hour}</span>
                    <div className="flex-1 bg-stone-100 rounded-full h-5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isPeak ? 'bg-red-400' : 'bg-emerald-400'}`}
                        style={{ width: `${Math.max(pct, 8)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold w-8 text-right ${isPeak ? 'text-red-600' : 'text-stone-600'}`}>{slot.count}</span>
                    <span className="text-[10px] text-stone-400 w-12 text-right">{slot.guests}G</span>
                  </div>
                )
              })}
              {hourlyStats.today.some(s => s.count >= 3) && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-stone-100">
                  <span className="material-symbols-outlined text-red-400 text-sm">warning</span>
                  <p className="text-xs text-red-600 font-semibold">
                    {hourlyStats.today.filter(s => s.count >= 3).map(s => s.hour).join(', ')} — Mehr Personal einplanen!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quiet slots (30 days) */}
        {hourlyStats.quietSlots.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-50 flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-500 text-lg">bedtime</span>
              </div>
              <div>
                <p className="font-bold text-on-surface text-sm">Ruhige Zeiten</p>
                <p className="text-[11px] text-on-surface-variant">Letzte 30 Tage • niedrigste Auslastung</p>
              </div>
            </div>
            <div className="px-5 py-3 space-y-2">
              {hourlyStats.quietSlots.map((slot, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-stone-500 w-8">{slot.dayLabel}</span>
                  <span className="text-xs font-mono text-stone-400 w-12">{slot.hour}</span>
                  <div className="flex-1 bg-stone-100 rounded-full h-3 overflow-hidden">
                    <div className="h-full rounded-full bg-amber-300" style={{ width: `${Math.max(slot.avg * 20, 5)}%` }} />
                  </div>
                  <span className="text-xs text-stone-500 w-20 text-right">{slot.avg} Buch./Tag</span>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-stone-100">
                <span className="material-symbols-outlined text-amber-400 text-sm">lightbulb</span>
                <p className="text-xs text-amber-600">Tipp: Promo-Aktion für diese Zeiten erwägen</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Unassigned Alert ───────────────────── */}
      {unassigned.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-500 text-xl mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-800 text-sm mb-2">
              {unassigned.length} Reservierung{unassigned.length > 1 ? 'en' : ''} noch ohne Tischzuweisung
            </p>
            <div className="flex flex-wrap gap-2">
              {unassigned.map(b => (
                <Link
                  key={b.id}
                  href="/admin/bookings"
                  className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-bold transition-colors"
                >
                  {b.bookingCode} · {b.guestName} · {b.startTime}
                </Link>
              ))}
            </div>
          </div>
          <Link href="/admin/bookings" className="shrink-0 text-xs font-semibold text-amber-700 hover:underline">
            Verwalten →
          </Link>
        </div>
      )}

      {/* ── Main Grid ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Active Bookings Feed */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-on-surface text-base">
                {showingUpcoming ? 'Kommende Reservierungen' : 'Aktive Reservierungen'}
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {showingUpcoming ? `${feedBookings.length} demnächst` : `${active.length} offen heute`}
              </p>
            </div>
            <Link href="/admin/bookings" className="text-xs font-semibold text-primary-container hover:underline">
              Alle anzeigen →
            </Link>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-14 skeleton rounded-xl" />)}
            </div>
          ) : feedBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <span className="material-symbols-outlined text-4xl text-stone-300 mb-2">event_busy</span>
              <p className="text-on-surface-variant text-sm">Keine aktiven oder kommenden Reservierungen</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-50 max-h-[420px] overflow-y-auto">
              {feedBookings.map((b) => (
                <div key={b.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-stone-50 transition-colors group">
                  {/* Time bubble */}
                  <div className="w-14 h-14 shrink-0 bg-[#3b1f0a]/5 rounded-2xl flex flex-col items-center justify-center">
                    <span className="text-sm font-bold text-[#3b1f0a] leading-none">{b.startTime}</span>
                    <span className="text-[9px] text-stone-400 mt-0.5">Uhr</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-on-surface truncate">{b.guestName}</p>
                      {!hasTableAssignment(b) && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-[10px] font-bold shrink-0">Kein Tisch</span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                      {showingUpcoming && `${new Date(b.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} · `}
                      {hasTableAssignment(b)
                        ? `${tableLabel(b)} · ${getAssignedTables(b).length > 1 ? `${getAssignedTables(b).length} Tische` : zoneLabels[getAssignedTables(b)[0].zone] || getAssignedTables(b)[0].zone}`
                        : 'Kein Tisch zugewiesen'}
                      {' · '}{b.guestCount} Gäste
                      {b.specialNote && ` · „${b.specialNote.substring(0, 30)}${b.specialNote.length > 30 ? '…' : ''}"`}
                    </p>
                  </div>

                  {/* Status + quick actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${statusColors[b.status]}`}>
                      {statusLabels[b.status]}
                    </span>

                    {/* Quick actions on hover */}
                    <div className="hidden group-hover:flex items-center gap-1">
                      {b.status === 'PENDING' && (
                        <button
                          onClick={() => quickStatus(b.bookingCode, 'CONFIRMED')}
                          title="Bestätigen"
                          className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">check</span>
                        </button>
                      )}
                      {b.status === 'CONFIRMED' && (
                        <button
                          onClick={() => quickStatus(b.bookingCode, 'SEATED')}
                          title="Eingecheckt"
                          className="p-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">chair</span>
                        </button>
                      )}
                      {b.status === 'SEATED' && (
                        <button
                          onClick={() => quickStatus(b.bookingCode, 'COMPLETED')}
                          title="Abschließen"
                          className="p-1.5 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">done_all</span>
                        </button>
                      )}
                      <button
                        onClick={() => quickStatus(b.bookingCode, 'NO_SHOW')}
                        title="No-show"
                        className="p-1.5 bg-red-50 text-red-400 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">person_off</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Today's timeline */}
          <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h2 className="font-bold text-on-surface text-base">Zeitplan heute</h2>
            </div>
            <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
              {loading ? (
                <div className="h-8 skeleton rounded-lg" />
              ) : bookings.filter(b => b.status !== 'CANCELLED').length === 0 ? (
                <p className="text-xs text-on-surface-variant text-center py-6">Keine Einträge</p>
              ) : (
                bookings
                  .filter(b => b.status !== 'CANCELLED')
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map(b => (
                    <div key={b.id} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-on-surface-variant w-10 shrink-0">{b.startTime}</span>
                      <div className="flex-1 flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-1.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          b.status === 'SEATED' ? 'bg-blue-500' :
                          b.status === 'CONFIRMED' ? 'bg-emerald-500' :
                          b.status === 'PENDING' ? 'bg-amber-500' :
                          'bg-stone-300'
                        }`} />
                        <span className="text-xs font-medium text-on-surface truncate">{b.guestName}</span>
                        <span className="text-[10px] text-on-surface-variant shrink-0">{b.guestCount}P</span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-2">
            <h2 className="font-bold text-on-surface text-sm mb-3">Schnellzugriff</h2>
            {[
              { href: '/admin/bookings', icon: 'event_available', label: 'Reservierungen verwalten', color: 'text-[#3b1f0a]', bg: 'bg-[#3b1f0a]/5' },
              { href: '/admin/scan',     icon: 'qr_code_scanner', label: 'QR-Scan öffnen',            color: 'text-amber-700',  bg: 'bg-amber-50' },
              { href: '/admin/floor',    icon: 'layers',          label: 'Tischplan öffnen',          color: 'text-blue-700',   bg: 'bg-blue-50' },
              { href: '/admin/waitlist', icon: 'group',           label: 'Warteliste',                color: 'text-purple-700', bg: 'bg-purple-50' },
              { href: '/admin/settings', icon: 'settings',        label: 'Einstellungen',             color: 'text-stone-600',  bg: 'bg-stone-50' },
            ].map(item => (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors active:scale-95">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.bg}`}>
                  <span className={`material-symbols-outlined text-[18px] ${item.color}`}>{item.icon}</span>
                </div>
                <span className="text-sm font-medium text-on-surface">{item.label}</span>
                <span className="material-symbols-outlined text-stone-300 text-sm ml-auto">chevron_right</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
