'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'

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

interface WaitlistEntry {
  id: string
  name: string
  phone: string
  guestCount: number
  desiredDate: string
  desiredTime: string
  zone: string | null
  status: string
  createdAt: string
}

const statusLabels: Record<string, string> = {
  PENDING: 'Ausstehend',
  CONFIRMED: 'Bestätigt',
  SEATED: 'Am Tisch',
  COMPLETED: 'Abgeschlossen',
  CANCELLED: 'Storniert',
  NO_SHOW: 'No-show',
}

const zoneLabels: Record<string, string> = {
  WINDOW: 'Fenster', OUTDOOR: 'Außen', QUIET: 'Ruhezone',
  WORKSPACE: 'Arbeitsplatz', BAR: 'Bar',
}

type HostTab = 'geschlossen' | 'platziert' | 'warteliste'
type BottomTab = 'tables' | 'bookings' | 'history' | 'host' | 'checkin'

function getAssignedTables(booking: Booking) {
  const assigned = booking.assignedTables?.map((item) => item.table) || []
  return assigned.length > 0 ? assigned : booking.table ? [booking.table] : []
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateHeader(d: Date) {
  const day = d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
  const weekday = d.toLocaleDateString('de-DE', { weekday: 'short' })
  return `${day}, ${weekday}.`
}

function isOpenNow() {
  const h = new Date().getHours()
  return h >= 9 && h < 22
}

interface AvailableTable {
  id: string
  number: number
  name: string
  zone: string
  capacity: number
  available: boolean
}

export default function HostPage() {
  const [date, setDate] = useState(new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [hostTab, setHostTab] = useState<HostTab>('geschlossen')
  const [bottomTab, setBottomTab] = useState<BottomTab>('host')
  const [selected, setSelected] = useState<Booking | null>(null)
  const [updatingCode, setUpdatingCode] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [now, setNow] = useState(new Date())

  // Walk-in state
  const [showWalkin, setShowWalkin] = useState(false)
  const [walkinForm, setWalkinForm] = useState({ name: '', phone: '', guestCount: '2', tableId: '', note: '' })
  const [walkinTables, setWalkinTables] = useState<AvailableTable[]>([])
  const [walkinSubmitting, setWalkinSubmitting] = useState(false)
  const [walkinError, setWalkinError] = useState('')
  const [walkinSuccess, setWalkinSuccess] = useState('')

  // Waitlist → Booking state
  const [convertingId, setConvertingId] = useState('')
  const [convertError, setConvertError] = useState('')
  const [convertSuccess, setConvertSuccess] = useState('')

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    fetchData()
  }, [date])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const dateStr = toDateStr(date)
      const [bRes, wRes] = await Promise.all([
        fetch(`/api/bookings?date=${dateStr}`),
        fetch('/api/waitlist?status=WAITING'),
      ])
      const bData = await bRes.json()
      const wData = await wRes.json()
      setBookings(bData.bookings || [])
      setWaitlist(wData.entries || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [date])

  async function updateStatus(code: string, status: string) {
    setUpdatingCode(code)
    try {
      await fetch(`/api/bookings/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setBookings(prev => prev.map(b =>
        b.bookingCode === code ? { ...b, status } : b
      ))
      if (selected?.bookingCode === code) {
        setSelected(prev => prev ? { ...prev, status } : null)
      }
    } catch { /* ignore */ } finally { setUpdatingCode('') }
  }

  function shiftDate(days: number) {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    setDate(d)
  }

  async function fetchWalkinTables() {
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const dateStr = toDateStr(date)
    try {
      const res = await fetch(`/api/tables?date=${dateStr}&time=${time}&guestCount=${walkinForm.guestCount}`)
      const data = await res.json()
      setWalkinTables(data.tables || [])
    } catch { /* ignore */ }
  }

  async function submitWalkin() {
    if (!walkinForm.name.trim()) { setWalkinError('Name ist Pflichtfeld'); return }
    setWalkinSubmitting(true)
    setWalkinError('')
    try {
      const now = new Date()
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: walkinForm.name, phone: walkinForm.phone || '–',
          guestCount: parseInt(walkinForm.guestCount), date: toDateStr(date),
          time, tableId: walkinForm.tableId || undefined,
          specialNote: walkinForm.note ? `[Walk-in] ${walkinForm.note}` : '[Walk-in]',
        }),
      })
      const data = await res.json()
      if (!res.ok) { setWalkinError(data.error || 'Fehler'); return }

      // Immediately set to SEATED
      if (data.bookingCode) {
        await fetch(`/api/bookings/${data.bookingCode}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'SEATED' }),
        })
      }

      setWalkinSuccess(`Walk-in ${data.bookingCode} erstellt!`)
      setWalkinForm({ name: '', phone: '', guestCount: '2', tableId: '', note: '' })
      fetchData()
      setTimeout(() => { setWalkinSuccess(''); setShowWalkin(false) }, 1500)
    } catch { setWalkinError('Verbindungsfehler') } finally { setWalkinSubmitting(false) }
  }

  async function convertWaitlistToBooking(entry: WaitlistEntry) {
    setConvertingId(entry.id)
    setConvertError('')
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: entry.name, phone: entry.phone,
          guestCount: entry.guestCount, date: entry.desiredDate.split('T')[0],
          time: entry.desiredTime, zone: entry.zone || undefined,
          specialNote: '[Von Warteliste]',
        }),
      })
      const data = await res.json()
      if (!res.ok) { setConvertError(data.error || 'Fehler'); return }

      // Mark waitlist entry as BOOKED
      await fetch('/api/waitlist', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id, status: 'BOOKED' }),
      })

      setConvertSuccess(`${entry.name} → ${data.bookingCode}`)
      fetchData()
      setTimeout(() => setConvertSuccess(''), 3000)
    } catch { setConvertError('Verbindungsfehler') } finally { setConvertingId('') }
  }

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return bookings.filter(b => {
      if (term && ![b.guestName, b.guestPhone, b.bookingCode].some(v => v.toLowerCase().includes(term))) return false
      return true
    })
  }, [bookings, searchTerm])

  const geschlossen = filtered.filter(b => ['PENDING', 'CONFIRMED'].includes(b.status))
  const platziert = filtered.filter(b => b.status === 'SEATED')
  const totalGuests = filtered.filter(b => !['CANCELLED', 'NO_SHOW'].includes(b.status))
    .reduce((s, b) => s + b.guestCount, 0)

  const tabBookings = hostTab === 'geschlossen' ? geschlossen
    : hostTab === 'platziert' ? platziert
    : []

  const open = isOpenNow()

  const bottomNav = [
    { id: 'tables' as BottomTab, icon: 'table_restaurant', label: 'Tische' },
    { id: 'bookings' as BottomTab, icon: 'calendar_month', label: 'Termine' },
    { id: 'history' as BottomTab, icon: 'history', label: 'Verlauf' },
    { id: 'host' as BottomTab, icon: 'inbox', label: 'Host' },
    { id: 'checkin' as BottomTab, icon: 'assignment_turned_in', label: 'Check-in' },
  ]

  return (
    <div className="flex flex-col h-screen bg-[#f5f5f5] overflow-hidden">

      {/* ── Top App Bar ─────────────────────────────── */}
      <header className="bg-[#1a1a1a] text-white px-4 pt-3 pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined">menu</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => shiftDate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">chevron_left</span>
            </button>
            <div className="text-center px-1">
              <p className="text-[13px] font-semibold leading-tight">{formatDateHeader(date)}</p>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${open ? 'bg-yellow-400' : 'bg-stone-500'}`} />
                <span className="text-[11px] text-white/70">{open ? 'Jetzt' : 'Geschlossen'}</span>
              </div>
            </div>
            <button
              onClick={() => shiftDate(1)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSearch(s => !s)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined">search</span>
            </button>
            <button
              onClick={() => { setShowWalkin(true); fetchWalkinTables() }}
              className="flex items-center gap-1.5 px-3 py-2 bg-white text-[#1a1a1a] rounded-xl text-xs font-bold active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-sm">directions_walk</span>
              Walk-in
            </button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="mt-2 mb-1">
            <input
              autoFocus
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Name, Code oder Telefon suchen…"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/30"
            />
          </div>
        )}
      </header>

      {/* ── Sub Header: settings + filter + title + guests ── */}
      <div className="bg-white border-b border-stone-200 px-3 py-2.5 flex items-center gap-2 shrink-0">
        <button className="w-9 h-9 rounded-lg border border-stone-200 flex items-center justify-center hover:bg-stone-50 transition-colors">
          <span className="material-symbols-outlined text-xl text-stone-500">settings</span>
        </button>
        <button className="w-9 h-9 rounded-lg border border-stone-200 flex items-center justify-center hover:bg-stone-50 transition-colors">
          <span className="material-symbols-outlined text-xl text-stone-500">tune</span>
        </button>

        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="h-5 skeleton rounded-md w-32" />
          ) : (
            <p className="font-bold text-[15px] text-stone-800 truncate">
              {hostTab === 'geschlossen' ? `Geschlossen (${geschlossen.length})`
                : hostTab === 'platziert' ? `Platziert (${platziert.length})`
                : `Warteliste (${waitlist.length})`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 text-stone-500">
          <span className="material-symbols-outlined text-lg">person</span>
          <span className="text-sm font-semibold">{totalGuests}</span>
        </div>
      </div>

      {/* ── Host Tabs ──────────────────────────────── */}
      <div className="bg-white border-b border-stone-200 flex shrink-0">
        {([
          { id: 'geschlossen', label: 'Geschlossen', count: geschlossen.length },
          { id: 'platziert', label: 'Platziert', count: platziert.length },
          { id: 'warteliste', label: 'Warteliste', count: waitlist.length },
        ] as { id: HostTab; label: string; count: number }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => { setHostTab(tab.id); setSelected(null) }}
            className={`flex-1 py-3 text-[13px] font-bold transition-all relative ${
              hostTab === tab.id
                ? 'text-[#c0392b]'
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                hostTab === tab.id
                  ? 'bg-[#c0392b] text-white'
                  : 'bg-stone-200 text-stone-500'
              }`}>
                {tab.count}
              </span>
            )}
            {hostTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c0392b] rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── Content ───────────────────────────────── */}
      {/* Walk-in Modal */}
      {showWalkin && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowWalkin(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg text-stone-800">Walk-in</h2>
                <p className="text-xs text-stone-400 mt-0.5">Gast ohne Reservierung direkt platzieren</p>
              </div>
              <button onClick={() => setShowWalkin(false)} className="w-9 h-9 rounded-full hover:bg-stone-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-stone-400">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">Name *</label>
                  <input value={walkinForm.name} onChange={e => setWalkinForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Name" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">Telefon</label>
                  <input value={walkinForm.phone} onChange={e => setWalkinForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="Optional" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">Gäste</label>
                <div className="flex gap-2">
                  {['1','2','3','4','5','6'].map(n => (
                    <button key={n} onClick={() => { setWalkinForm(f => ({ ...f, guestCount: n })); fetchWalkinTables() }}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                        walkinForm.guestCount === n ? 'bg-[#1a1a1a] text-white' : 'bg-stone-100 text-stone-600'
                      }`}>{n}</button>
                  ))}
                </div>
              </div>
              {walkinTables.length > 0 && (
                <div>
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">Tisch wählen</label>
                  <div className="grid grid-cols-4 gap-2">
                    {walkinTables.filter(t => t.available).map(t => (
                      <button key={t.id} onClick={() => setWalkinForm(f => ({ ...f, tableId: t.id }))}
                        className={`py-3 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                          walkinForm.tableId === t.id ? 'bg-[#c0392b] text-white' : 'bg-stone-100 text-stone-600'
                        }`}>
                        T-{t.number}
                        <span className="block text-[10px] font-normal opacity-70">{t.capacity}P</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">Notiz</label>
                <input value={walkinForm.note} onChange={e => setWalkinForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="z.B. Allergie, Kinderstuhl…" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm" />
              </div>
              {walkinError && <p className="text-red-600 text-xs font-semibold bg-red-50 px-3 py-2 rounded-xl">{walkinError}</p>}
              {walkinSuccess && <p className="text-emerald-700 text-xs font-semibold bg-emerald-50 px-3 py-2 rounded-xl">{walkinSuccess}</p>}
              <button onClick={submitWalkin} disabled={walkinSubmitting}
                className="w-full py-3.5 bg-[#c0392b] text-white rounded-xl text-sm font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-base">{walkinSubmitting ? 'progress_activity' : 'directions_walk'}</span>
                Walk-in platzieren
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Convert success/error banners */}
        {convertSuccess && (
          <div className="mx-3 mt-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            {convertSuccess}
          </div>
        )}
        {convertError && (
          <div className="mx-3 mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            {convertError}
          </div>
        )}

        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 skeleton rounded-2xl" />
            ))}
          </div>
        ) : hostTab === 'warteliste' ? (
          waitlist.length === 0 ? (
            <EmptyState text="Derzeit keine Partien auf der Warteliste" />
          ) : (
            <div className="p-3 space-y-2">
              {waitlist.map(entry => (
                <div key={entry.id} className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[15px] text-stone-800 truncate">{entry.name}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{entry.desiredTime} · {entry.phone}</p>
                      {entry.zone && (
                        <span className="inline-block mt-2 px-2 py-0.5 bg-stone-100 text-stone-500 rounded-md text-[11px] font-semibold">
                          {zoneLabels[entry.zone] || entry.zone}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-stone-500 shrink-0">
                      <span className="material-symbols-outlined text-base">person</span>
                      <span className="font-bold text-sm">{entry.guestCount}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="flex-1 py-2 bg-[#c0392b] text-white rounded-xl text-xs font-bold active:scale-95 transition-all">
                      Benachrichtigen
                    </button>
                    <button
                      onClick={() => convertWaitlistToBooking(entry)}
                      disabled={convertingId === entry.id}
                      className="flex-1 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {convertingId === entry.id
                        ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                        : <span className="material-symbols-outlined text-sm">event_available</span>
                      }
                      Reservieren
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : tabBookings.length === 0 ? (
          <EmptyState text="Derzeit keine Partien" />
        ) : (
          <div className="p-3 space-y-2">
            {tabBookings
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map(booking => {
                const tables = getAssignedTables(booking)
                const isUpdating = updatingCode === booking.bookingCode

                return (
                  <div
                    key={booking.id}
                    onClick={() => setSelected(s => s?.id === booking.id ? null : booking)}
                    className={`bg-white rounded-2xl shadow-sm border transition-all cursor-pointer active:scale-[0.99] ${
                      selected?.id === booking.id
                        ? 'border-[#c0392b]/40 ring-2 ring-[#c0392b]/10'
                        : 'border-stone-100 hover:border-stone-200'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Time */}
                        <div className="shrink-0 w-12 h-12 bg-stone-50 rounded-xl flex flex-col items-center justify-center border border-stone-100">
                          <span className="text-[13px] font-bold text-stone-700 leading-none">{booking.startTime}</span>
                          <span className="text-[9px] text-stone-400 mt-0.5">Uhr</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-[15px] text-stone-800 truncate">{booking.guestName}</p>
                            <div className="flex items-center gap-1 text-stone-500 shrink-0">
                              <span className="material-symbols-outlined text-base">person</span>
                              <span className="font-bold text-sm">{booking.guestCount}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {/* Status badge */}
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              booking.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700'
                              : booking.status === 'PENDING' ? 'bg-amber-100 text-amber-700'
                              : booking.status === 'SEATED' ? 'bg-blue-100 text-blue-700'
                              : 'bg-stone-100 text-stone-500'
                            }`}>
                              {statusLabels[booking.status]}
                            </span>

                            {/* Table */}
                            {tables.length > 0 ? (
                              <span className="text-[11px] text-stone-400 font-semibold">
                                {tables.map(t => `T-${t.number}`).join(', ')}
                              </span>
                            ) : (
                              <span className="text-[11px] text-amber-500 font-semibold">Kein Tisch</span>
                            )}

                            {/* End time */}
                            <span className="text-[11px] text-stone-300">bis {booking.endTime}</span>
                          </div>

                          {booking.specialNote && (
                            <p className="mt-1.5 text-[11px] text-stone-400 italic truncate">
                              „{booking.specialNote}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Expanded actions */}
                      {selected?.id === booking.id && (
                        <div className="mt-4 pt-4 border-t border-stone-100 space-y-3">
                          {/* Contact */}
                          <div className="flex items-center gap-3">
                            <a
                              href={`tel:${booking.guestPhone}`}
                              onClick={e => e.stopPropagation()}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-stone-100 text-stone-700 rounded-xl text-xs font-bold active:scale-95 transition-all"
                            >
                              <span className="material-symbols-outlined text-base">call</span>
                              {booking.guestPhone}
                            </a>
                            <span className="text-[10px] font-mono text-stone-400">{booking.bookingCode}</span>
                          </div>

                          {/* Status actions */}
                          <div className="grid grid-cols-2 gap-2">
                            {booking.status === 'PENDING' && (
                              <button
                                onClick={e => { e.stopPropagation(); updateStatus(booking.bookingCode, 'CONFIRMED') }}
                                disabled={isUpdating}
                                className="py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-sm">check</span>
                                Bestätigen
                              </button>
                            )}
                            {['PENDING', 'CONFIRMED'].includes(booking.status) && (
                              <button
                                onClick={e => { e.stopPropagation(); updateStatus(booking.bookingCode, 'SEATED') }}
                                disabled={isUpdating}
                                className="py-3 bg-blue-600 text-white rounded-xl text-xs font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-sm">chair</span>
                                Angekommen
                              </button>
                            )}
                            {booking.status === 'SEATED' && (
                              <button
                                onClick={e => { e.stopPropagation(); updateStatus(booking.bookingCode, 'COMPLETED') }}
                                disabled={isUpdating}
                                className="py-3 bg-stone-700 text-white rounded-xl text-xs font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-sm">done_all</span>
                                Abschließen
                              </button>
                            )}
                            {!['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(booking.status) && (
                              <button
                                onClick={e => { e.stopPropagation(); updateStatus(booking.bookingCode, 'NO_SHOW') }}
                                disabled={isUpdating}
                                className="py-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-sm">person_off</span>
                                No-show
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* ── Bottom Navigation ───────────────────── */}
      <nav className="bg-white border-t border-stone-200 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shrink-0">
        <div className="grid grid-cols-5 gap-1 max-w-xl mx-auto">
          {bottomNav.map(item => {
            const isActive = bottomTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setBottomTab(item.id)}
                className={`min-h-[56px] rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                  isActive
                    ? 'bg-[#c0392b] text-white'
                    : 'text-stone-400 hover:bg-stone-100'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span className="text-[10px] font-bold">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center px-6">
      <span className="material-symbols-outlined text-4xl text-stone-300 mb-3">event_busy</span>
      <p className="text-sm text-stone-400 font-medium">{text}</p>
    </div>
  )
}
