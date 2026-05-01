'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
const ScanModal = dynamic(() => import('@/components/admin/ScanModal'), { ssr: false })

interface Table {
  id: string
  number: number
  name: string
  zone: string
  capacity: number
  status: string
  available?: boolean
}

interface Booking {
  id: string
  bookingCode: string
  guestName: string
  guestPhone: string
  guestEmail: string | null
  guestCount: number
  date: string
  startTime: string
  endTime: string
  status: string
  specialNote: string | null
  customerId: string | null
  table: { id: string; number: number; zone: string; name: string } | null
  customer: { id: string; name: string; phone: string; preferredZone: string | null; createdAt: string } | null
  assignedTables?: Array<{ table: { id: string; number: number; zone: string; name: string } }>
  preOrders: Array<{ quantity: number; menuItem: { name: string; price: number } }>
  _visitCount?: number
  _tier?: 'NEUKUNDE' | 'STAMMKUNDE' | 'VIP'
}

const statusColors: Record<string, string> = {
  PENDING:   'bg-amber-100 text-amber-700 border-amber-200',
  CONFIRMED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  SEATED:    'bg-blue-100 text-blue-700 border-blue-200',
  COMPLETED: 'bg-stone-100 text-stone-600 border-stone-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
  NO_SHOW:   'bg-purple-100 text-purple-700 border-purple-200',
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

const activeStatuses = ['PENDING', 'CONFIRMED', 'SEATED']
const terminalStatuses = ['COMPLETED', 'CANCELLED', 'NO_SHOW']

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getBookingDateKey(booking: Booking) {
  return booking.date.split('T')[0]
}

function formatDateShort(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
  })
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
  if (assigned.length === 0) return ''
  return assigned.map((table) => `T-${String(table.number).padStart(2, '0')}`).join(', ')
}

export default function AdminBookingsPage() {
  const [bookings, setBookings]         = useState<Booking[]>([])
  const [tables, setTables]             = useState<Table[]>([])
  const [loading, setLoading]           = useState(true)
  const [dateFilter, setDateFilter]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected]         = useState<Booking | null>(null)
  const [assignMode, setAssignMode]     = useState(false)
  const [assigning, setAssigning]       = useState(false)
  const [searchTerm, setSearchTerm]     = useState('')
  const [updatingCode, setUpdatingCode] = useState('')

  // ── New booking modal ────────────────────────────────────────────────
  const [showNewBooking, setShowNewBooking] = useState(false)
  const [newForm, setNewForm] = useState({
    name: '', phone: '', email: '', guestCount: '2',
    date: new Date().toISOString().split('T')[0],
    time: '10:00', tableId: '', specialNote: '', status: 'CONFIRMED',
  })
  const [submitting, setSubmitting] = useState(false)
  const [newError, setNewError]     = useState('')
  const [newSuccess, setNewSuccess] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [timeFilter, setTimeFilter]   = useState('')   // e.g. '10:00'

  // ── Status tabs ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'SEATED' | 'DONE' | 'MISSED'>('ACTIVE')
  const TAB_STATUSES = {
    ACTIVE:  ['PENDING', 'CONFIRMED'],
    SEATED:  ['SEATED'],
    DONE:    ['COMPLETED'],
    MISSED:  ['NO_SHOW', 'CANCELLED'],
  }

  // ── Edit mode ──────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({
    guestName: '', guestPhone: '', guestEmail: '', guestCount: '',
    date: '', startTime: '', endTime: '', specialNote: '',
  })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')

  useEffect(() => { fetchBookings() }, [dateFilter, statusFilter])

  // Auto-refresh every 60 minutes
  useEffect(() => {
    const interval = setInterval(() => fetchBookings(), 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [dateFilter, statusFilter])

  async function fetchBookings() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateFilter) params.set('date', dateFilter)
      if (statusFilter) params.set('status', statusFilter)
      const query = params.toString()
      const url = `/api/bookings${query ? `?${query}` : ''}`
      const res = await fetch(url)
      const data = await res.json()
      const rawBookings: Booking[] = data.bookings || []

      // Enrich with visit counts — batch by customerId
      const customerIds = [...new Set(rawBookings.filter(b => b.customerId).map(b => b.customerId as string))]
      const visitCounts = new Map<string, number>()
      if (customerIds.length > 0) {
        // Count bookings per customer in one pass from current data
        for (const cid of customerIds) {
          try {
            const cRes = await fetch(`/api/customers/${rawBookings.find(b => b.customerId === cid)?.guestPhone || ''}`)
            const cData = await cRes.json()
            if (cData.found) visitCounts.set(cid, cData.customer.visitCount)
          } catch { /* ignore */ }
        }
      }

      const enriched = rawBookings.map(b => {
        const count = b.customerId ? (visitCounts.get(b.customerId) || 1) : 0
        let tier: 'NEUKUNDE' | 'STAMMKUNDE' | 'VIP' = 'NEUKUNDE'
        if (count >= 10) tier = 'VIP'
        else if (count >= 3) tier = 'STAMMKUNDE'
        return { ...b, _visitCount: count, _tier: count > 0 ? tier : undefined }
      })

      setBookings(enriched)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  async function fetchTables(options?: { date?: string; time?: string; guestCount?: number | string }) {
    try {
      const tableDate = options?.date || (selected ? getBookingDateKey(selected) : dateFilter || newForm.date)
      const time = options?.time || selected?.startTime || newForm.time
      const guestCount = options?.guestCount || selected?.guestCount || newForm.guestCount
      const params = new URLSearchParams()
      if (tableDate) params.set('date', tableDate)
      if (time) params.set('time', time)
      if (guestCount) params.set('guestCount', String(guestCount))
      const query = params.toString()
      const res = await fetch(query ? `/api/tables?${query}` : '/api/tables')
      const data = await res.json()
      setTables(data.tables || [])
    } catch { /* ignore */ }
  }

  async function updateStatus(code: string, status: string) {
    setUpdatingCode(`${code}:${status}`)
    try {
      const res = await fetch(`/api/bookings/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) return
      const nextStatus = data.booking?.status || status
      const nextTable = data.booking?.table
      const nextAssignedTables = data.booking?.assignedTables
      setBookings((items) => items.map((b) => (
        b.bookingCode === code
          ? {
            ...b,
            status: nextStatus,
            ...(nextTable !== undefined ? { table: nextTable } : {}),
            ...(nextAssignedTables !== undefined ? { assignedTables: nextAssignedTables } : {}),
          }
          : b
      )))
      // If the booking just left the current tab, close the detail panel
      if (!TAB_STATUSES[activeTab].includes(nextStatus)) {
        setSelected(null)
      } else if (selected?.bookingCode === code) {
        setSelected((b) => b ? {
          ...b,
          status: nextStatus,
          ...(nextTable !== undefined ? { table: nextTable } : {}),
          ...(nextAssignedTables !== undefined ? { assignedTables: nextAssignedTables } : {}),
        } : null)
      }
    } catch { /* ignore */ } finally { setUpdatingCode('') }
  }

  async function assignTable(bookingId: string, tableId: string) {
    setAssigning(true)
    try {
      await fetch(`/api/bookings/${selected?.bookingCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, status: 'CONFIRMED' }),
      })
      fetchBookings()
      setAssignMode(false)
      // update selected inline
      const t = tables.find(t => t.id === tableId)
      if (t && selected) {
        const assignedTable = { id: t.id, number: t.number, zone: t.zone, name: t.name }
        setSelected({
          ...selected,
          table: assignedTable,
          assignedTables: [{ table: assignedTable }],
          status: 'CONFIRMED',
        })
      }
    } catch { /* ignore */ } finally { setAssigning(false) }
  }

  async function submitNewBooking() {
    if (!newForm.name.trim() || !newForm.phone.trim()) {
      setNewError('Name und Telefon sind Pflichtfelder')
      return
    }
    setSubmitting(true)
    setNewError('')
    try {
      const res  = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        newForm.name,
          phone:       newForm.phone,
          email:       newForm.email || undefined,
          guestCount:  parseInt(newForm.guestCount),
          date:        newForm.date,
          time:        newForm.time,
          tableId:     newForm.tableId || undefined,
          specialNote: newForm.specialNote || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setNewError(data.error || 'Fehler'); return }

      // If specific status set by admin, patch it
      if (newForm.status !== 'PENDING' && data.bookingCode) {
        await fetch(`/api/bookings/${data.bookingCode}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newForm.status }),
        })
      }

      setNewSuccess(`Reservierung ${data.bookingCode} erstellt!`)
      setNewForm(prev => ({ ...prev, name: '', phone: '', email: '', specialNote: '', tableId: '' }))
      fetchBookings()
      setTimeout(() => { setNewSuccess(''); setShowNewBooking(false) }, 2000)
    } catch { setNewError('Verbindungsfehler') } finally { setSubmitting(false) }
  }

  function startEditBooking() {
    if (!selected) return
    setEditForm({
      guestName: selected.guestName,
      guestPhone: selected.guestPhone,
      guestEmail: selected.guestEmail || '',
      guestCount: String(selected.guestCount),
      date: selected.date.split('T')[0],
      startTime: selected.startTime,
      endTime: selected.endTime,
      specialNote: selected.specialNote || '',
    })
    setEditMode(true)
    setEditError('')
    setEditSuccess('')
  }

  async function saveEditBooking() {
    if (!selected) return
    setEditSaving(true)
    setEditError('')
    try {
      const res = await fetch(`/api/bookings/${selected.bookingCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: editForm.guestName,
          guestPhone: editForm.guestPhone,
          guestEmail: editForm.guestEmail,
          guestCount: parseInt(editForm.guestCount),
          date: editForm.date,
          startTime: editForm.startTime,
          endTime: editForm.endTime,
          specialNote: editForm.specialNote,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setEditError(data.error || 'Fehler'); return }

      // Update local state
      const updated = data.booking
      setBookings(items => items.map(b =>
        b.bookingCode === selected.bookingCode ? { ...b, ...updated } : b
      ))
      setSelected(prev => prev ? { ...prev, ...updated } : null)
      setEditMode(false)
      setEditSuccess('Gespeichert ✓')
      fetchBookings()
      setTimeout(() => setEditSuccess(''), 2000)
    } catch { setEditError('Verbindungsfehler') } finally { setEditSaving(false) }
  }

  const visibleBookings = useMemo(() => {
    // First filter by current tab
    const tabFiltered = bookings.filter(b => TAB_STATUSES[activeTab].includes(b.status))
    // Then filter by time (>= timeFilter)
    const timeFiltered = timeFilter
      ? tabFiltered.filter(b => b.startTime >= timeFilter)
      : tabFiltered
    const term = searchTerm.trim().toLowerCase()
    if (!term) return timeFiltered
    return timeFiltered.filter((b) => [
      b.bookingCode, b.guestName, b.guestPhone, b.guestEmail || '',
      tableLabel(b),
      ...getAssignedTables(b).map((table) => String(table.number)),
    ].some((value) => value.toLowerCase().includes(term)))
  }, [bookings, searchTerm, activeTab, timeFilter])

  // Available time slots from current bookings (for the dropdown)
  const timeSlots = useMemo(() => {
    const times = new Set(bookings.map(b => b.startTime.slice(0, 5)))
    return Array.from(times).sort()
  }, [bookings])

  // Hourly summary — bookings + guests per time slot (from all tab bookings)
  const hourlySummary = useMemo(() => {
    const tabAll = bookings.filter(b => TAB_STATUSES[activeTab].includes(b.status))
    const map = new Map<string, { bookings: number; guests: number }>()
    tabAll.forEach(b => {
      const t = b.startTime.slice(0, 5)
      const cur = map.get(t) || { bookings: 0, guests: 0 }
      map.set(t, { bookings: cur.bookings + 1, guests: cur.guests + b.guestCount })
    })
    return map
  }, [bookings, activeTab])

  // Tab counts (from all bookings, ignoring search)
  const tabCounts = useMemo(() => ({
    ACTIVE: bookings.filter(b => TAB_STATUSES.ACTIVE.includes(b.status)).length,
    SEATED: bookings.filter(b => TAB_STATUSES.SEATED.includes(b.status)).length,
    DONE:   bookings.filter(b => TAB_STATUSES.DONE.includes(b.status)).length,
    MISSED: bookings.filter(b => TAB_STATUSES.MISSED.includes(b.status)).length,
  }), [bookings])

  const groupedBookings = useMemo(() => {
    const groups = new Map<string, { date: string; time: string; bookings: Booking[] }>()

    visibleBookings.forEach((booking) => {
      const date = getBookingDateKey(booking)
      const key = `${date}-${booking.startTime}`
      const group = groups.get(key) || { date, time: booking.startTime, bookings: [] }
      group.bookings.push(booking)
      groups.set(key, group)
    })

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        bookings: group.bookings.sort((a, b) => a.guestName.localeCompare(b.guestName)),
      }))
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
  }, [visibleBookings])

  const summary = useMemo(() => {
    const active = visibleBookings.filter((b) => activeStatuses.includes(b.status))
    return {
      reservations: active.length,
      guests: active.reduce((sum, b) => sum + b.guestCount, 0),
      arrived: visibleBookings.filter((b) => ['SEATED', 'COMPLETED'].includes(b.status)).length,
      open: visibleBookings.filter((b) => ['PENDING', 'CONFIRMED'].includes(b.status)).length,
      unassigned: active.filter((b) => !hasTableAssignment(b)).length,
    }
  }, [visibleBookings])

  const unassigned = bookings.filter(b => !hasTableAssignment(b) && b.status !== 'CANCELLED' && b.status !== 'NO_SHOW')
  const filterScope = dateFilter
    ? `am ${new Date(dateFilter).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
    : 'gesamt'

  function shiftDate(days: number) {
    const base = dateFilter ? new Date(`${dateFilter}T12:00:00`) : new Date()
    base.setDate(base.getDate() + days)
    setDateFilter(toDateInputValue(base))
  }

  const selectedTables = selected ? getAssignedTables(selected) : []

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="bg-[#842f25] text-white rounded-2xl p-3 sm:p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDate(-1)}
            aria-label="Voriger Tag"
            className="w-11 h-11 rounded-xl hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <div className="flex-1 min-w-0 text-center">
            <p className="text-xs sm:text-sm text-white/70 font-semibold uppercase tracking-wide">
              {dateFilter ? 'Tagesansicht' : 'Alle Termine'}
            </p>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">
              Reservierungen ({visibleBookings.length})
            </h1>
          </div>
          <button
            onClick={() => shiftDate(1)}
            aria-label="Nächster Tag"
            className="w-11 h-11 rounded-xl hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
          <button
            onClick={() => { setShowNewBooking(true); fetchTables({ date: newForm.date, time: newForm.time, guestCount: newForm.guestCount }) }}
            className="hidden sm:flex items-center gap-2 px-4 py-3 bg-white text-[#842f25] rounded-xl text-sm font-bold active:scale-95 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Neu
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { label: 'Aktiv', value: summary.reservations, icon: 'event_available' },
            { label: 'Gäste', value: summary.guests, icon: 'group' },
            { label: 'Angekommen', value: summary.arrived, icon: 'chair' },
            { label: 'Ohne Tisch', value: summary.unassigned, icon: 'table_restaurant' },
          ].map((item) => (
            <div key={item.label} className="bg-white/10 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-white/80">{item.icon}</span>
              <div>
                <p className="text-lg font-bold leading-none">{item.value}</p>
                <p className="text-[11px] text-white/70 font-semibold">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-stone-100 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-on-surface">{bookings.length} Einträge {filterScope}</p>
            <p className="text-xs text-on-surface-variant">{summary.open} offen · {unassigned.length} ohne Tischzuweisung</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setDateFilter(toDateInputValue(new Date()))}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all active:scale-95"
            >
              Heute
            </button>
          <button
            onClick={() => setDateFilter('')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
              !dateFilter
                ? 'bg-primary-container text-white shadow-sm'
                : 'bg-white border border-outline-variant text-on-surface-variant hover:bg-stone-50'
            }`}
          >
            Alle Termine
          </button>
          <input type="date" value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-white border border-outline-variant rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-brand-amber"
          />
          <select value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-outline-variant rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-brand-amber"
          >
            <option value="">Alle Status</option>
            {Object.entries(statusLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="bg-white border border-outline-variant rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-brand-amber"
          >
            <option value="">Alle Zeiten</option>
            {timeSlots.map(t => {
              const s = hourlySummary.get(t)
              return (
                <option key={t} value={t}>
                  ab {t} Uhr{s ? ` — ${s.bookings} Res. / ${s.guests} Gäste` : ''}
                </option>
              )
            })}
          </select>
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#faf6f0] border border-[#e8dcc8] text-[#3b1f0a] rounded-xl text-sm font-bold active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-base">qr_code_scanner</span>
            Scan
          </button>
          <button
            onClick={() => { setShowNewBooking(true); fetchTables({ date: newForm.date, time: newForm.time, guestCount: newForm.guestCount }) }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-container text-white rounded-xl text-sm font-bold active:scale-95 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Neue Reservierung
          </button>
          </div>
        </div>

        {/* QR Scanner Modal */}
        {showScanner && <ScanModal onClose={() => setShowScanner(false)} />}

        {/* Status Tabs */}
        <div className="flex gap-1 mt-1 bg-stone-50 rounded-xl p-1 overflow-x-auto">
          {([
            { key: 'ACTIVE', label: 'Aktiv', icon: 'pending', color: 'text-amber-600' },
            { key: 'SEATED', label: 'Am Tisch', icon: 'table_restaurant', color: 'text-blue-600' },
            { key: 'DONE',   label: 'Fertig',   icon: 'check_circle', color: 'text-stone-500' },
            { key: 'MISSED', label: 'Nicht erschienen', icon: 'person_off', color: 'text-red-400' },
          ] as const).map(tab => {
            const count = tabCounts[tab.key]
            const isActive = activeTab === tab.key
            return (
              <button key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSelected(null) }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex-1 justify-center ${
                  isActive
                    ? 'bg-white text-[#3b1f0a] shadow-sm'
                    : 'text-stone-400 hover:text-stone-600'
                }`}>
                <span className={`material-symbols-outlined text-base ${isActive ? tab.color : ''}`}
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-[#3b1f0a] text-white' : 'bg-stone-200 text-stone-500'
                  }`}>{count}</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xl">search</span>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Name, Code, Telefon oder Tisch suchen"
            className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary-container"
          />
        </div>
      </div>

      {/* Unassigned alert */}
      {unassigned.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-600 text-xl mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          <div>
            <p className="font-semibold text-amber-800 text-sm">{unassigned.length} Reservierung{unassigned.length > 1 ? 'en' : ''} ohne Tischzuweisung</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {unassigned.map(b => (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelected(b)
                    setAssignMode(true)
                    fetchTables({ date: getBookingDateKey(b), time: b.startTime, guestCount: b.guestCount })
                  }}
                  className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-bold transition-colors active:scale-95"
                >
                  {b.bookingCode} · {b.guestName} · {b.startTime}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main layout: table + side drawer */}
      <div className="flex gap-6">

        {/* Timeline overview */}
        <div className={`flex-1 transition-all ${selected ? 'hidden lg:block' : ''}`}>
          {loading ? (
            <div className="bg-white rounded-2xl border border-stone-100 p-5 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-28 skeleton rounded-xl" />)}
            </div>
          ) : groupedBookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-100 p-10 text-center">
              <span className="material-symbols-outlined text-5xl text-stone-300 mb-3">event_busy</span>
              <p className="font-semibold text-on-surface">Keine Reservierungen gefunden</p>
              <p className="text-sm text-on-surface-variant mt-1">Filter oder Suche ändern.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {groupedBookings.map((group) => {
                const groupGuests = group.bookings
                  .filter((b) => !['CANCELLED', 'NO_SHOW'].includes(b.status))
                  .reduce((sum, b) => sum + b.guestCount, 0)

                return (
                  <section key={`${group.date}-${group.time}`} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 px-1">
                      <h2 className="text-xl sm:text-2xl font-bold text-on-surface-variant">
                        {group.time} {dateFilter ? '' : `/ ${formatDateShort(group.date)}`}
                      </h2>
                      <div className="flex items-center gap-4 text-on-surface-variant font-bold">
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-xl">event_available</span>
                          {group.bookings.length}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-xl">person</span>
                          {groupGuests}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {group.bookings.map((b) => {
                        const assignedTables = getAssignedTables(b)
                        const isUpdating = updatingCode.startsWith(`${b.bookingCode}:`)
                        const isTerminal = terminalStatuses.includes(b.status)

                        return (
                          <div
                            key={b.id}
                            onClick={() => { setSelected(b); setAssignMode(false) }}
                            className={`bg-white rounded-2xl border shadow-sm p-4 cursor-pointer transition-all hover:shadow-md active:scale-[0.99] ${
                              selected?.id === b.id ? 'border-primary-container ring-2 ring-primary-container/10' : 'border-stone-200'
                            } ${b.status === 'SEATED' ? 'bg-blue-50/40' : ''}`}
                          >
                            <div className="flex flex-col sm:flex-row gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-lg sm:text-xl font-bold text-on-surface truncate">{b.guestName}</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <p className="text-sm text-on-surface-variant">
                                        {b.startTime} – {b.endTime} · <span className="font-mono">{b.bookingCode}</span>
                                      </p>
                                      {b._tier === 'VIP' && (
                                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-bold border border-purple-200">🏆 VIP ({b._visitCount}x)</span>
                                      )}
                                      {b._tier === 'STAMMKUNDE' && (
                                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-bold border border-amber-200">⭐ Stamm ({b._visitCount}x)</span>
                                      )}
                                      {b._tier === 'NEUKUNDE' && b._visitCount === 1 && (
                                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-bold border border-emerald-200">🆕 Neu</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0 text-on-surface-variant">
                                    <span className="material-symbols-outlined text-lg">group</span>
                                    <span className="text-lg font-bold">{b.guestCount}</span>
                                  </div>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusColors[b.status] || statusColors.PENDING}`}>
                                    {statusLabels[b.status] || b.status}
                                  </span>
                                  {b.specialNote && (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant bg-surface-container px-2 py-1 rounded-lg">
                                      <span className="material-symbols-outlined text-sm">chat_bubble</span>
                                      Hinweis
                                    </span>
                                  )}
                                  {b.preOrders?.length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant bg-surface-container px-2 py-1 rounded-lg">
                                      <span className="material-symbols-outlined text-sm">restaurant</span>
                                      Vorbestellt
                                    </span>
                                  )}
                                  <a
                                    href={`tel:${b.guestPhone}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant bg-surface-container px-2 py-1 rounded-lg hover:bg-surface-container-high"
                                  >
                                    <span className="material-symbols-outlined text-sm">call</span>
                                    {b.guestPhone}
                                  </a>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                  {b.status === 'PENDING' && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); updateStatus(b.bookingCode, 'CONFIRMED') }}
                                      disabled={isUpdating}
                                      className="min-h-11 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-base">check</span>
                                      Bestätigen
                                    </button>
                                  )}
                                  {!isTerminal && b.status !== 'SEATED' && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); updateStatus(b.bookingCode, 'SEATED') }}
                                      disabled={isUpdating}
                                      className="min-h-11 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-base">chair</span>
                                      Angekommen
                                    </button>
                                  )}
                                  {b.status === 'SEATED' && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); updateStatus(b.bookingCode, 'COMPLETED') }}
                                      disabled={isUpdating}
                                      className="min-h-11 px-4 py-2 bg-stone-700 text-white rounded-xl text-sm font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-base">done_all</span>
                                      Abschließen
                                    </button>
                                  )}
                                  {!isTerminal && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); updateStatus(b.bookingCode, 'NO_SHOW') }}
                                      disabled={isUpdating}
                                      className="min-h-11 px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                                      aria-label={`${b.guestName} als No-show markieren`}
                                    >
                                      <span className="material-symbols-outlined text-base">person_off</span>
                                      No-show
                                    </button>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelected(b)
                                  setAssignMode(true)
                                  fetchTables({ date: getBookingDateKey(b), time: b.startTime, guestCount: b.guestCount })
                                }}
                                className={`sm:w-24 min-h-20 rounded-2xl border-2 flex sm:flex-col items-center justify-center gap-2 px-4 py-3 text-center transition-all active:scale-95 ${
                                  assignedTables.length > 0
                                    ? 'border-stone-200 bg-surface-container-low text-on-surface hover:bg-surface-container'
                                    : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                }`}
                              >
                                <span className="material-symbols-outlined text-xl">table_restaurant</span>
                                {assignedTables.length > 0 ? (
                                  <span>
                                    <span className="block text-lg font-bold leading-tight">{tableLabel(b)}</span>
                                    <span className="block text-[11px] font-semibold text-on-surface-variant">
                                      {assignedTables.length > 1 ? `${assignedTables.length} Tische` : zoneLabels[assignedTables[0].zone] || assignedTables[0].zone}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-sm font-bold">Tisch?</span>
                                )}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail Drawer */}
        {selected && (
          <div className="w-full lg:w-96 shrink-0">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden sticky top-6">
              {/* Drawer header */}
              <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant/20 flex items-center justify-between">
                <div>
                  <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Buchungscode</p>
                  <p className="font-mono font-bold text-primary-container text-lg">{selected.bookingCode}</p>
                </div>
                <div className="flex items-center gap-1">
                  {!editMode ? (
                    <button
                      onClick={startEditBooking}
                      className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
                      title="Bearbeiten"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditMode(false)}
                      className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
                      title="Abbrechen"
                    >
                      <span className="material-symbols-outlined text-lg">undo</span>
                    </button>
                  )}
                  <button onClick={() => { setSelected(null); setAssignMode(false); setEditMode(false) }} className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {editSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    {editSuccess}
                  </div>
                )}
                {editError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">error</span>
                    {editError}
                  </div>
                )}

                {editMode ? (
                  /* ── EDIT MODE ──────────────────────────── */
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Name</label>
                      <input value={editForm.guestName} onChange={e => setEditForm(f => ({ ...f, guestName: e.target.value }))}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Telefon</label>
                        <input value={editForm.guestPhone} onChange={e => setEditForm(f => ({ ...f, guestPhone: e.target.value }))}
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">E-Mail</label>
                        <input value={editForm.guestEmail} onChange={e => setEditForm(f => ({ ...f, guestEmail: e.target.value }))}
                          placeholder="optional" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Datum</label>
                        <input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Von</label>
                        <input type="time" value={editForm.startTime} onChange={e => setEditForm(f => ({ ...f, startTime: e.target.value }))}
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm font-mono" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Bis</label>
                        <input type="time" value={editForm.endTime} onChange={e => setEditForm(f => ({ ...f, endTime: e.target.value }))}
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm font-mono" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Gäste</label>
                      <div className="flex gap-1">
                        {['1','2','3','4','5','6','7','8'].map(n => (
                          <button key={n} onClick={() => setEditForm(f => ({ ...f, guestCount: n }))}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                              editForm.guestCount === n ? 'bg-primary-container text-white' : 'bg-stone-100 text-stone-600'
                            }`}>{n}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Notiz</label>
                      <textarea value={editForm.specialNote} onChange={e => setEditForm(f => ({ ...f, specialNote: e.target.value }))}
                        rows={2} placeholder="Besondere Wünsche…"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm resize-none" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditMode(false)}
                        className="flex-1 py-2.5 bg-stone-100 text-stone-600 rounded-xl text-xs font-bold active:scale-95 transition-all">
                        Abbrechen
                      </button>
                      <button onClick={saveEditBooking} disabled={editSaving}
                        className="flex-1 py-2.5 bg-primary-container text-white rounded-xl text-xs font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-sm">{editSaving ? 'progress_activity' : 'save'}</span>
                        Speichern
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── VIEW MODE ──────────────────────────── */
                  <>
                    {/* Guest */}
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-on-primary-container text-xl">person</span>
                      <div>
                        <p className="font-semibold text-on-surface">{selected.guestName}</p>
                        <p className="text-sm text-on-surface-variant">{selected.guestPhone}</p>
                        {selected.guestEmail && <p className="text-xs text-on-surface-variant">{selected.guestEmail}</p>}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-surface-container p-3 rounded-xl">
                        <p className="text-xs text-on-surface-variant mb-1">Datum</p>
                        <p className="font-semibold text-on-surface text-sm">{new Date(selected.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}</p>
                      </div>
                      <div className="bg-surface-container p-3 rounded-xl">
                        <p className="text-xs text-on-surface-variant mb-1">Uhrzeit</p>
                        <p className="font-semibold text-on-surface text-sm">{selected.startTime} – {selected.endTime}</p>
                      </div>
                      <div className="bg-surface-container p-3 rounded-xl">
                        <p className="text-xs text-on-surface-variant mb-1">Gäste</p>
                        <p className="font-semibold text-on-surface text-sm">{selected.guestCount} Personen</p>
                      </div>
                      <div className="bg-surface-container p-3 rounded-xl">
                        <p className="text-xs text-on-surface-variant mb-1">Tisch</p>
                        {selectedTables.length > 0 ? (
                          <p className="font-semibold text-on-surface text-sm">
                            {tableLabel(selected)}
                            <span className="block text-xs font-normal text-on-surface-variant mt-0.5">
                              {selectedTables.length > 1 ? `${selectedTables.length} Tische` : zoneLabels[selectedTables[0].zone] || selectedTables[0].zone}
                            </span>
                          </p>
                        ) : (
                          <button
                            onClick={() => {
                              setAssignMode(true)
                              fetchTables({ date: getBookingDateKey(selected), time: selected.startTime, guestCount: selected.guestCount })
                            }}
                            className="text-amber-600 font-semibold text-xs flex items-center gap-1 hover:text-amber-700"
                          >
                            <span className="material-symbols-outlined text-sm">add_circle</span>
                            Tisch zuweisen
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Note */}
                    {selected.specialNote && (
                      <div className="bg-secondary-container/30 rounded-xl p-3">
                        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Hinweise</p>
                        <p className="text-sm text-on-surface">{selected.specialNote}</p>
                      </div>
                    )}

                    {/* Kundenhistorie */}
                    {selected._visitCount && selected._visitCount > 0 && (
                      <div className={`rounded-xl p-3 border ${
                        selected._tier === 'VIP' ? 'bg-purple-50 border-purple-200'
                          : selected._tier === 'STAMMKUNDE' ? 'bg-amber-50 border-amber-200'
                          : 'bg-emerald-50 border-emerald-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {selected._tier === 'VIP' ? 'emoji_events' : selected._tier === 'STAMMKUNDE' ? 'star' : 'person_add'}
                          </span>
                          <p className="text-xs font-bold uppercase tracking-wider">
                            {selected._tier === 'VIP' ? `🏆 VIP-Kunde (${selected._visitCount}×)` 
                              : selected._tier === 'STAMMKUNDE' ? `⭐ Stammkunde (${selected._visitCount}×)` 
                              : '🆕 Neukunde'}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-stone-500">Besuche</p>
                            <p className="font-bold">{selected._visitCount}</p>
                          </div>
                          {selected.customer?.createdAt && (
                            <div>
                              <p className="text-stone-500">Kunde seit</p>
                              <p className="font-bold">{new Date(selected.customer.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                            </div>
                          )}
                          {selected.customer?.preferredZone && (
                            <div>
                              <p className="text-stone-500">Bevorzugte Zone</p>
                              <p className="font-bold">{zoneLabels[selected.customer.preferredZone] || selected.customer.preferredZone}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Pre-orders */}
                {selected.preOrders?.length > 0 && (
                  <div className="bg-surface-container rounded-xl p-3">
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">Vorbestellung</p>
                    {selected.preOrders.map((po, i) => (
                      <div key={i} className="flex justify-between text-xs py-0.5">
                        <span>{po.quantity}× {po.menuItem.name}</span>
                        <span className="text-on-surface-variant">{(po.menuItem.price * po.quantity / 100).toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Status badge */}
                <div className={`px-3 py-2 rounded-xl border text-center text-sm font-bold ${statusColors[selected.status]}`}>
                  {statusLabels[selected.status]}
                </div>

                {/* Status actions */}
                <div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Status ändern</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => updateStatus(selected.bookingCode, key)}
                        disabled={selected.status === key}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 border ${
                          selected.status === key
                            ? `${statusColors[key]} cursor-default`
                            : 'bg-surface-container text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-high'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Assign table panel */}
                {assignMode && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tisch zuweisen</p>
                      <button onClick={() => setAssignMode(false)} className="text-xs text-on-surface-variant hover:text-on-surface">Abbrechen</button>
                    </div>
                    {tables.length === 0 ? (
                      <p className="text-xs text-on-surface-variant text-center py-4">Keine Tische geladen</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                        {tables
                          .filter(t => t.capacity >= selected.guestCount)
                          .map(t => {
                            const isAvailable = t.available ?? t.status === 'EMPTY'

                            return (
                              <button
                                key={t.id}
                                disabled={assigning || !isAvailable}
                                onClick={() => assignTable(selected.id, t.id)}
                                className={`p-2.5 rounded-xl border-2 text-center transition-all active:scale-95 disabled:cursor-not-allowed ${
                                  isAvailable
                                    ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                                    : 'border-stone-200 bg-stone-50 text-stone-500 opacity-60'
                                }`}
                              >
                                <p className="font-bold text-sm">T-{String(t.number).padStart(2,'0')}</p>
                                <p className="text-[10px]">{zoneLabels[t.zone] || t.zone}</p>
                                <p className="text-[10px]">{t.capacity} Pl.</p>
                                <p className={`text-[9px] font-semibold mt-0.5 ${isAvailable ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {isAvailable ? 'Frei' : 'Reserviert'}
                                </p>
                              </button>
                            )
                          })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Neue Reservierung Modal ─────────────────────────────────────── */}
      {showNewBooking && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNewBooking(false)} />

          {/* Slide-over panel */}
          <div className="relative ml-auto w-full max-w-md h-full bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
              <div>
                <h2 className="font-bold text-on-surface text-lg">Neue Reservierung</h2>
                <p className="text-xs text-on-surface-variant">Direkt vom Admin erstellt</p>
              </div>
              <button onClick={() => setShowNewBooking(false)} className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">

              {newError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">error</span>
                  {newError}
                </div>
              )}
              {newSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  {newSuccess}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Name *</label>
                <input type="text" required value={newForm.name}
                  onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Max Mustermann"
                  className="w-full bg-stone-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container"
                />
              </div>

              {/* Phone + Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Telefon *</label>
                  <input type="tel" value={newForm.phone}
                    onChange={e => setNewForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+49 171..."
                    className="w-full bg-stone-100 border-none rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-primary-container"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">E-Mail</label>
                  <input type="email" value={newForm.email}
                    onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="email@..."
                    className="w-full bg-stone-100 border-none rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-primary-container"
                  />
                </div>
              </div>

              {/* Date + Time + Guests */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Datum</label>
                  <input type="date" value={newForm.date}
                    onChange={e => {
                      const date = e.target.value
                      setNewForm(f => ({ ...f, date, tableId: '' }))
                      fetchTables({ date, time: newForm.time, guestCount: newForm.guestCount })
                    }}
                    className="w-full bg-stone-100 border-none rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-primary-container"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Uhrzeit</label>
                  <input type="time" value={newForm.time}
                    onChange={e => {
                      const time = e.target.value
                      setNewForm(f => ({ ...f, time, tableId: '' }))
                      fetchTables({ date: newForm.date, time, guestCount: newForm.guestCount })
                    }}
                    className="w-full bg-stone-100 border-none rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-primary-container"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Gäste</label>
                  <select value={newForm.guestCount}
                    onChange={e => {
                      const guestCount = e.target.value
                      setNewForm(f => ({ ...f, guestCount, tableId: '' }))
                      fetchTables({ date: newForm.date, time: newForm.time, guestCount })
                    }}
                    className="w-full bg-stone-100 border-none rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-primary-container appearance-none"
                  >
                    {Array.from({ length: 36 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              {/* Table assignment */}
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Tisch zuweisen</label>
                <select value={newForm.tableId}
                  onChange={e => setNewForm(f => ({ ...f, tableId: e.target.value }))}
                  className="w-full bg-stone-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container appearance-none"
                >
                  <option value="">— Kein Tisch (Admin weist später zu)</option>
                  {tables.map(t => {
                    const isAvailable = t.available ?? t.status === 'EMPTY'
                    return (
                      <option key={t.id} value={t.id} disabled={!isAvailable}>
                        T-{String(t.number).padStart(2,'0')} · {zoneLabels[t.zone] || t.zone} · {t.capacity} Pl. · {isAvailable ? 'Frei' : 'Reserviert'}
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Status setzen</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['PENDING','CONFIRMED','SEATED'] as const).map(s => (
                    <button key={s} type="button"
                      onClick={() => setNewForm(f => ({ ...f, status: s }))}
                      className={`py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border ${
                        newForm.status === s
                          ? `${statusColors[s]} border-current`
                          : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                      }`}
                    >
                      {statusLabels[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Special note */}
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Hinweise</label>
                <textarea value={newForm.specialNote} rows={2}
                  onChange={e => setNewForm(f => ({ ...f, specialNote: e.target.value }))}
                  placeholder="Besondere Wünsche, Anmerkungen…"
                  className="w-full bg-stone-100 border-none rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-primary-container"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-stone-100 flex gap-3">
              <button onClick={() => setShowNewBooking(false)} className="flex-1 py-3 bg-stone-100 text-stone-700 font-semibold rounded-xl text-sm hover:bg-stone-200 transition-colors active:scale-95">
                Abbrechen
              </button>
              <button
                onClick={submitNewBooking}
                disabled={submitting}
                className="flex-1 py-3 bg-primary-container text-white font-bold rounded-xl text-sm active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {submitting ? (
                  <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-base">event_available</span>
                )}
                {submitting ? 'Erstellen…' : 'Reservierung erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
