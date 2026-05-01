'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Table {
  id: string
  number: number
  name: string
  zone: string
  capacity: number
  status: string
  positionX: number
  positionY: number
  shape: 'round' | 'square' | 'rect' | 'bar'
  bookings?: Array<{ guestName: string; guestCount: number; startTime: string; endTime: string; bookingCode: string; status: string }>
}

interface ZoneArea {
  id: string
  label: string
  x: number
  y: number
  w: number
  h: number
  color: string
  bg: string
  border: string
}

// ─── Config ───────────────────────────────────────────────────────────────────
const ZONE_DEFAULTS: ZoneArea[] = [
  { id: 'INNEN',    label: 'Innenraum',    x: 10,  y: 10,  w: 560, h: 400, color: '#7c5c38', bg: 'rgba(253,248,242,0.9)', border: '#e8d9c0' },
  { id: 'BAR',      label: 'Küchen-Bar',   x: 590, y: 10,  w: 200, h: 180, color: '#6b3fa0', bg: 'rgba(247,242,249,0.9)', border: '#d4b8e8' },
  { id: 'TERRASSE', label: 'Terrasse',     x: 10,  y: 430, w: 380, h: 180, color: '#2d6a4f', bg: 'rgba(240,249,244,0.9)', border: '#a8d9be' },
  { id: 'WINDOW',   label: 'Fensterplatz', x: 590, y: 210, w: 200, h: 200, color: '#335577', bg: 'rgba(240,246,255,0.9)', border: '#b8d4f0' },
  { id: 'WC',       label: 'WC / Eingang', x: 405, y: 430, w: 165, h: 180, color: '#888',    bg: 'rgba(245,245,244,0.9)', border: '#d0d0c8' },
]

const STATUS_CFG: Record<string, { bg: string; border: string; text: string; dot: string; label: string }> = {
  EMPTY:    { bg: '#f0fdf4', border: '#22c55e', text: '#15803d', dot: '#22c55e', label: 'Frei' },
  BOOKED:   { bg: '#fffbeb', border: '#f59e0b', text: '#b45309', dot: '#f59e0b', label: 'Reserviert' },
  SEATED:   { bg: '#fff1f2', border: '#f43f5e', text: '#be123c', dot: '#f43f5e', label: 'Besetzt' },
  CLEANING: { bg: '#faf5ff', border: '#a855f7', text: '#7e22ce', dot: '#a855f7', label: 'Räumen' },
}

const SHAPES = [
  { id: 'round2',  shape: 'round'  as const, capacity: 2,  label: 'Rund 2P',   w: 60,  h: 60  },
  { id: 'round4',  shape: 'round'  as const, capacity: 4,  label: 'Rund 4P',   w: 72,  h: 72  },
  { id: 'square2', shape: 'square' as const, capacity: 2,  label: 'Quad. 2P',  w: 60,  h: 60  },
  { id: 'square4', shape: 'square' as const, capacity: 4,  label: 'Quad. 4P',  w: 72,  h: 72  },
  { id: 'rect6',   shape: 'rect'   as const, capacity: 6,  label: 'Tisch 6P',  w: 100, h: 58  },
  { id: 'rect8',   shape: 'rect'   as const, capacity: 8,  label: 'Tisch 8P',  w: 120, h: 58  },
  { id: 'bar1',    shape: 'bar'    as const, capacity: 1,  label: 'Barhocker', w: 40,  h: 40  },
  { id: 'bar2',    shape: 'bar'    as const, capacity: 2,  label: 'Bar 2P',    w: 80,  h: 40  },
]

function getTableSize(t: Pick<Table, 'shape' | 'capacity'>) {
  if (t.shape === 'bar')  return { w: t.capacity === 1 ? 44 : 82, h: 40 }
  if (t.shape === 'rect') return { w: t.capacity >= 8 ? 120 : 100, h: 58 }
  const b = t.capacity >= 4 ? 72 : 60
  return { w: b, h: b }
}

// ─── Table shape component ────────────────────────────────────────────────────
function TableNode({ table, selected, editMode, onDown, onClick, booking }: {
  table: Table
  selected: boolean
  editMode: boolean
  onDown?: (e: React.PointerEvent) => void
  onClick?: () => void
  booking?: { guestName: string; guestCount: number; startTime: string; endTime: string; status: string } | null
}) {
  // If a booking exists for this slot, override the table's visual status
  const displayStatus = booking
    ? (booking.status === 'SEATED' ? 'SEATED' : 'BOOKED')
    : table.status
  const cfg = STATUS_CFG[displayStatus] || STATUS_CFG.EMPTY
  const { w, h } = getTableSize(table)
  const radius = table.shape === 'round' ? '50%' : table.shape === 'bar' ? '6px' : '10px'
  const zoneColor = ZONE_DEFAULTS.find(z => z.id === table.zone)?.color || '#999'

  return (
    <div onPointerDown={onDown} onClick={onClick}
      className="absolute select-none"
      style={{ left: table.positionX, top: table.positionY, width: w, height: h,
        cursor: editMode ? 'grab' : 'pointer', zIndex: selected ? 30 : 15 }}
    >
      <div style={{ width: '100%', height: '100%', backgroundColor: cfg.bg,
        border: `2px solid ${selected ? '#1a0a00' : cfg.border}`,
        borderRadius: radius, position: 'relative', overflow: 'hidden',
        boxShadow: selected ? '0 0 0 3px rgba(26,10,0,0.2), 0 4px 12px rgba(0,0,0,0.15)' : '0 2px 6px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        transition: 'box-shadow 0.1s',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: cfg.text, lineHeight: 1 }}>
          T-{String(table.number).padStart(2, '0')}
        </span>
        {table.shape !== 'bar' && (
          <span style={{ fontSize: 9, color: '#aaa', marginTop: 2 }}>{table.capacity}P</span>
        )}
        {/* Booking overlay info */}
        {booking ? (
          <>
            <span style={{ fontSize: 8, color: cfg.text, fontWeight: 700, marginTop: 1, maxWidth: w - 8,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center', lineHeight: 1.2 }}>
              {booking.guestName.split(' ')[0]}
            </span>
            <span style={{ fontSize: 7.5, color: cfg.text, opacity: 0.8 }}>
              {booking.startTime}–{booking.endTime} · {booking.guestCount}P
            </span>
          </>
        ) : table.bookings?.[0] && (
          <span style={{ fontSize: 8, color: cfg.text, opacity: 0.8, marginTop: 1 }}>
            {table.bookings[0].startTime}
          </span>
        )}
        {/* Zone stripe at bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
          backgroundColor: zoneColor, opacity: 0.4,
          borderRadius: table.shape === 'round' ? '0 0 50% 50%' : '0 0 8px 8px' }} />
      </div>
      {/* Status dot */}
      <div style={{ position: 'absolute', top: -4, right: -4, width: 10, height: 10,
        backgroundColor: cfg.dot, borderRadius: '50%', border: '2px solid white',
        boxShadow: '0 0 4px rgba(0,0,0,0.2)' }} />
    </div>
  )
}

// ─── Zone component with resize handles ──────────────────────────────────────
const MIN_W = 100
const MIN_H = 80

function ZoneBox({ zone, editMode, onMove, onResize }: {
  zone: ZoneArea
  editMode: boolean
  onMove: (id: string, dx: number, dy: number) => void
  onResize: (id: string, dw: number, dh: number, anchor: string) => void
}) {
  const moveRef   = useRef<{ startX: number; startY: number } | null>(null)
  const resizeRef = useRef<{ startX: number; startY: number; anchor: string } | null>(null)

  function startMove(e: React.PointerEvent) {
    if (!editMode) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    moveRef.current = { startX: e.clientX, startY: e.clientY }
  }
  function onMoveMove(e: React.PointerEvent) {
    if (!moveRef.current) return
    const dx = e.clientX - moveRef.current.startX
    const dy = e.clientY - moveRef.current.startY
    moveRef.current = { startX: e.clientX, startY: e.clientY }
    onMove(zone.id, dx, dy)
  }
  function endMove() { moveRef.current = null }

  function startResize(e: React.PointerEvent, anchor: string) {
    if (!editMode) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    resizeRef.current = { startX: e.clientX, startY: e.clientY, anchor }
  }
  function onResizeMove(e: React.PointerEvent, anchor: string) {
    if (!resizeRef.current || resizeRef.current.anchor !== anchor) return
    const dx = e.clientX - resizeRef.current.startX
    const dy = e.clientY - resizeRef.current.startY
    resizeRef.current = { ...resizeRef.current, startX: e.clientX, startY: e.clientY }
    onResize(zone.id, dx, dy, anchor)
  }
  function endResize() { resizeRef.current = null }

  const handles = [
    { id: 'se', style: { bottom: -5, right: -5, cursor: 'se-resize' } },
    { id: 'sw', style: { bottom: -5, left: -5,  cursor: 'sw-resize' } },
    { id: 'ne', style: { top: -5,    right: -5, cursor: 'ne-resize' } },
    { id: 'nw', style: { top: -5,    left: -5,  cursor: 'nw-resize' } },
    { id: 'e',  style: { top: '50%', right: -5, transform: 'translateY(-50%)', cursor: 'e-resize' } },
    { id: 'w',  style: { top: '50%', left: -5,  transform: 'translateY(-50%)', cursor: 'w-resize' } },
    { id: 's',  style: { left: '50%', bottom: -5, transform: 'translateX(-50%)', cursor: 's-resize' } },
    { id: 'n',  style: { left: '50%', top: -5,    transform: 'translateX(-50%)', cursor: 'n-resize' } },
  ]

  return (
    <div style={{
      position: 'absolute', left: zone.x, top: zone.y,
      width: zone.w, height: zone.h,
      backgroundColor: zone.bg,
      border: `2px ${editMode ? 'solid' : 'dashed'} ${zone.border}`,
      borderRadius: 16, zIndex: 1,
    }}>
      {/* Draggable header strip */}
      <div
        onPointerDown={startMove}
        onPointerMove={onMoveMove}
        onPointerUp={endMove}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 28,
          display: 'flex', alignItems: 'center', paddingLeft: 12, gap: 6,
          cursor: editMode ? 'move' : 'default',
          borderRadius: '14px 14px 0 0',
          backgroundColor: editMode ? `${zone.border}33` : 'transparent',
          userSelect: 'none',
        }}
      >
        {editMode && (
          <span style={{ fontSize: 10, color: zone.color, opacity: 0.5 }}>⠿</span>
        )}
        <span style={{ fontSize: 10, fontWeight: 700, color: zone.color,
          letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.75 }}>
          {zone.label}
        </span>
      </div>

      {/* Resize handles (edit mode only) */}
      {editMode && handles.map(h => (
        <div key={h.id}
          onPointerDown={e => startResize(e, h.id)}
          onPointerMove={e => onResizeMove(e, h.id)}
          onPointerUp={endResize}
          style={{
            position: 'absolute', width: 10, height: 10,
            backgroundColor: zone.color, borderRadius: 2,
            opacity: 0.7, zIndex: 5, ...h.style,
          }}
        />
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const CANVAS_W = 820
const CANVAS_H = 640

export default function AdminFloorPage() {
  const [tables, setTables]         = useState<Table[]>([])
  const [zones, setZones]           = useState<ZoneArea[]>(ZONE_DEFAULTS)
  const [loading, setLoading]       = useState(true)
  const [editMode, setEditMode]     = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerZone, setPickerZone] = useState('INNEN')

  // ── Booking overlay ───────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0]
  const nowHour  = new Date().getHours()
  const nearestSlot = `${String(nowHour).padStart(2,'0')}:00`
  const [viewDate, setViewDate] = useState(todayStr)
  const [viewTime, setViewTime] = useState(nearestSlot)
  // map: tableId -> booking info
  const [bookingMap, setBookingMap] = useState<Record<string, { guestName: string; guestCount: number; startTime: string; endTime: string; status: string }>>({}) 

  // Derive selected from tables array so it always stays in sync
  const selected = selectedId ? tables.find(t => t.id === selectedId) || null : null
  const setSelected = (t: Table | null) => setSelectedId(t?.id || null)
  const [savedMsg, setSavedMsg]     = useState('')

  const canvasRef   = useRef<HTMLDivElement>(null)
  const tableDragRef = useRef<{ id: string; ox: number; oy: number } | null>(null)

  // ── Load tables + bookings ────────────────────────────────────────────────
  useEffect(() => {
    const saved = getSaved()
    if (saved.zones) setZones(saved.zones)

    fetch('/api/tables')
      .then(r => r.json())
      .then(data => {
        const raw = (data.tables || []) as Table[]
        const merged = raw.map((t, i) => ({
          ...t,
          shape:     saved.tables?.[t.id]?.shape || 'square' as Table['shape'],
          positionX: saved.tables?.[t.id]?.x ?? (40 + (i % 5) * 110),
          positionY: saved.tables?.[t.id]?.y ?? (50 + Math.floor(i / 5) * 100),
          zone:      saved.tables?.[t.id]?.zone || t.zone || 'INNEN',
        }))
        setTables(merged)
      })
      .catch(() => setTables(generateDemo(saved)))
      .finally(() => setLoading(false))
  }, [])

  // Fetch bookings for selected date+time to build bookingMap
  useEffect(() => {
    if (!viewDate) return
    const params = new URLSearchParams({ date: viewDate })
    fetch(`/api/bookings?${params}`)
      .then(r => r.json())
      .then(data => {
        const bookings: Array<{
          assignedTables?: Array<{ table: { id: string } }>
          table?: { id: string }
          startTime: string
          endTime: string
          guestName: string
          guestCount: number
          status: string
        }> = data.bookings || []

        // Filter to bookings that overlap the selected time
        const relevant = bookings.filter(b => {
          if (['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(b.status)) return false
          if (!viewTime) return true
          return b.startTime <= viewTime && b.endTime > viewTime
        })

        // Build map: tableId -> booking
        const map: Record<string, { guestName: string; guestCount: number; startTime: string; endTime: string; status: string }> = {}
        relevant.forEach(b => {
          const tableIds = b.assignedTables?.map(a => a.table.id) || (b.table ? [b.table.id] : [])
          tableIds.forEach(id => {
            map[id] = { guestName: b.guestName, guestCount: b.guestCount,
              startTime: b.startTime, endTime: b.endTime, status: b.status }
          })
        })
        setBookingMap(map)
      })
      .catch(() => setBookingMap({}))
  }, [viewDate, viewTime])

  function getSaved() {
    try { return JSON.parse(localStorage.getItem('omoi_floor_v2') || '{}') } catch { return {} }
  }

  function persistSave(tbls: Table[], zns: ZoneArea[]) {
    const t: Record<string, unknown> = {}
    tbls.forEach(tb => { t[tb.id] = { x: tb.positionX, y: tb.positionY, shape: tb.shape, zone: tb.zone } })
    localStorage.setItem('omoi_floor_v2', JSON.stringify({ tables: t, zones: zns }))
  }

  function generateDemo(saved: Record<string, unknown>): Table[] {
    const savedTables = (saved as { tables?: Record<string, { x?: number; y?: number; shape?: Table['shape']; zone?: string }> }).tables
    const defs = [
      { n:1, z:'INNEN',    x:40,  y:60,  s:'round'  as const, c:2 },
      { n:2, z:'INNEN',    x:120, y:60,  s:'round'  as const, c:2 },
      { n:3, z:'INNEN',    x:210, y:60,  s:'round'  as const, c:4 },
      { n:4, z:'INNEN',    x:310, y:60,  s:'square' as const, c:4 },
      { n:5, z:'INNEN',    x:40,  y:170, s:'rect'   as const, c:6 },
      { n:6, z:'INNEN',    x:200, y:170, s:'rect'   as const, c:6 },
      { n:7, z:'INNEN',    x:40,  y:270, s:'square' as const, c:4 },
      { n:8, z:'INNEN',    x:140, y:270, s:'square' as const, c:4 },
      { n:9, z:'BAR',      x:620, y:50,  s:'bar'    as const, c:1 },
      {n:10, z:'BAR',      x:670, y:50,  s:'bar'    as const, c:1 },
      {n:11, z:'BAR',      x:720, y:50,  s:'bar'    as const, c:1 },
      {n:12, z:'BAR',      x:620, y:110, s:'bar'    as const, c:2 },
      {n:13, z:'TERRASSE', x:40,  y:460, s:'round'  as const, c:2 },
      {n:14, z:'TERRASSE', x:120, y:460, s:'round'  as const, c:2 },
      {n:15, z:'TERRASSE', x:210, y:460, s:'rect'   as const, c:6 },
      {n:16, z:'WINDOW',   x:620, y:230, s:'square' as const, c:2 },
      {n:17, z:'WINDOW',   x:700, y:230, s:'square' as const, c:2 },
      {n:18, z:'WINDOW',   x:620, y:310, s:'square' as const, c:4 },
    ]
    return defs.map(d => ({
      id: `demo-${d.n}`, number: d.n, name: `Tisch ${d.n}`,
      zone: savedTables?.[`demo-${d.n}`]?.zone || d.z,
      capacity: d.c,
      status: ['EMPTY','EMPTY','BOOKED','SEATED','EMPTY'][d.n % 5] || 'EMPTY',
      positionX: savedTables?.[`demo-${d.n}`]?.x ?? d.x,
      positionY: savedTables?.[`demo-${d.n}`]?.y ?? d.y,
      shape: savedTables?.[`demo-${d.n}`]?.shape || d.s,
    }))
  }

  // ── Zone move & resize ─────────────────────────────────────────────────────
  const handleZoneMove = useCallback((id: string, dx: number, dy: number) => {
    setZones(prev => prev.map(z => z.id === id
      ? { ...z, x: Math.max(0, z.x + dx), y: Math.max(0, z.y + dy) }
      : z
    ))
  }, [])

  const handleZoneResize = useCallback((id: string, dx: number, dy: number, anchor: string) => {
    setZones(prev => prev.map(z => {
      if (z.id !== id) return z
      let { x, y, w, h } = z

      if (anchor.includes('e')) w = Math.max(MIN_W, w + dx)
      if (anchor.includes('s')) h = Math.max(MIN_H, h + dy)
      if (anchor.includes('w')) { const nw = Math.max(MIN_W, w - dx); x += w - nw; w = nw }
      if (anchor.includes('n')) { const nh = Math.max(MIN_H, h - dy); y += h - nh; h = nh }

      return { ...z, x, y, w, h }
    }))
  }, [])

  // ── Table drag ────────────────────────────────────────────────────────────
  const handleTableDown = useCallback((e: React.PointerEvent, tableId: string) => {
    if (!editMode) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const canvas = canvasRef.current
    if (!canvas) return
    const rect  = canvas.getBoundingClientRect()
    const table = tables.find(t => t.id === tableId)
    if (!table) return
    tableDragRef.current = {
      id: tableId,
      ox: e.clientX - rect.left - table.positionX,
      oy: e.clientY - rect.top  - table.positionY,
    }
    setSelectedId(tableId)
    e.preventDefault()
  }, [editMode, tables])

  const handleCanvasMove = useCallback((e: React.PointerEvent) => {
    if (!tableDragRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left - tableDragRef.current.ox, CANVAS_W - 80))
    const y = Math.max(0, Math.min(e.clientY - rect.top  - tableDragRef.current.oy, CANVAS_H - 60))
    const id = tableDragRef.current.id
    setTables(prev => prev.map(t => t.id === id ? { ...t, positionX: x, positionY: y } : t))
  }, [])

  const handleCanvasUp = useCallback(() => { tableDragRef.current = null }, [])

  // ── Save ──────────────────────────────────────────────────────────────────
  function handleSave() {
    persistSave(tables, zones)
    setSavedMsg('Gespeichert ✓')
    setTimeout(() => setSavedMsg(''), 2500)
  }

  // ── Status update ─────────────────────────────────────────────────────────
  async function updateStatus(tableId: string, status: string) {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, status } : t))
    try {
      await fetch(`/api/tables/${tableId}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    } catch { /* demo mode */ }
  }

  // ── Add table ─────────────────────────────────────────────────────────────
  function addTable(s: typeof SHAPES[number]) {
    const zone = zones.find(z => z.id === pickerZone) || zones[0]
    const maxN  = Math.max(0, ...tables.map(t => t.number))
    const t: Table = {
      id: `local-${Date.now()}`, number: maxN + 1, name: `Tisch ${maxN + 1}`,
      zone: pickerZone, capacity: s.capacity, status: 'EMPTY',
      positionX: zone.x + 30 + Math.random() * (zone.w - 80),
      positionY: zone.y + 35 + Math.random() * (zone.h - 70),
      shape: s.shape,
    }
    setTables(prev => [...prev, t])
    setShowPicker(false)
    setSelectedId(t.id)
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  function deleteSelected() {
    if (!selected) return
    setTables(prev => prev.filter(t => t.id !== selected.id))
    setSelectedId(null)
  }

  function changeShape(shape: Table['shape'], capacity: number) {
    if (!selected) return
    setTables(prev => prev.map(t => t.id === selected.id ? { ...t, shape, capacity } : t))
  }

  function changeZone(zone: string) {
    if (!selected) return
    setTables(prev => prev.map(t => t.id === selected.id ? { ...t, zone } : t))
  }

  function resetLayout() {
    setZones(ZONE_DEFAULTS)
  }

  if (loading) return <div className="p-8"><div className="h-[640px] skeleton rounded-2xl" /></div>

  const counts = {
    EMPTY:    tables.filter(t => t.status === 'EMPTY').length,
    BOOKED:   tables.filter(t => t.status === 'BOOKED').length,
    SEATED:   tables.filter(t => t.status === 'SEATED').length,
    CLEANING: tables.filter(t => t.status === 'CLEANING').length,
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-stone-100 shrink-0 gap-4 flex-wrap">
        <div className="flex items-center gap-5">
          <h1 className="text-lg font-bold text-on-surface">Live-Tischplan</h1>

          {/* Date + time selector */}
          <div className="flex items-center gap-2 bg-[#faf6f0] border border-[#e8dcc8] rounded-xl px-3 py-1.5">
            <span className="material-symbols-outlined text-base text-[#7c5c38]" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
            <input type="date" value={viewDate}
              onChange={e => setViewDate(e.target.value)}
              className="bg-transparent text-sm font-semibold text-[#3b1f0a] focus:outline-none cursor-pointer"
            />
            <span className="text-stone-300">|</span>
            <span className="material-symbols-outlined text-base text-[#7c5c38]" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
            <input type="time" value={viewTime}
              onChange={e => setViewTime(e.target.value)}
              className="bg-transparent text-sm font-semibold text-[#3b1f0a] focus:outline-none cursor-pointer w-[72px]"
            />
            {Object.keys(bookingMap).length > 0 && (
              <span className="ml-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                {Object.keys(bookingMap).length} belegt
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {Object.entries(STATUS_CFG).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5 text-xs text-stone-500">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.dot }} />
                {v.label} <span className="font-bold text-stone-700">{counts[k as keyof typeof counts]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {savedMsg && (
            <span className="text-xs font-semibold text-emerald-600 px-3 py-1.5 bg-emerald-50 rounded-xl">{savedMsg}</span>
          )}

          {editMode && (
            <>
              <button onClick={resetLayout}
                className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold hover:bg-stone-200 active:scale-95 transition-all">
                <span className="material-symbols-outlined text-sm">restart_alt</span>
                Reset Layout
              </button>
              <button onClick={() => setShowPicker(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#3b1f0a] text-white rounded-xl text-xs font-bold active:scale-95 transition-all">
                <span className="material-symbols-outlined text-sm">add</span>
                Tisch hinzufügen
              </button>
              <button onClick={handleSave}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold active:scale-95 transition-all">
                <span className="material-symbols-outlined text-sm">save</span>
                Speichern
              </button>
            </>
          )}

          <button
            onClick={() => { setEditMode(v => !v); setSelectedId(null); setShowPicker(false) }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              editMode ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{editMode ? 'lock_open' : 'edit'}</span>
            {editMode ? 'Bearbeiten aktiv' : 'Layout bearbeiten'}
          </button>
        </div>
      </div>

      {/* ── Shape Picker (floating) ───────────────────────────────────────── */}
      {showPicker && editMode && (
        <div className="absolute z-50 bg-white rounded-2xl shadow-2xl border border-stone-200 p-5 w-80"
          style={{ top: 112, right: 290 }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">Tisch hinzufügen</h3>
            <button onClick={() => setShowPicker(false)} className="w-6 h-6 flex items-center justify-center hover:bg-stone-100 rounded-full">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          {/* Zone selector */}
          <p className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-2">Bereich</p>
          <div className="grid grid-cols-2 gap-1.5 mb-4">
            {zones.map(z => (
              <button key={z.id} onClick={() => setPickerZone(z.id)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all border"
                style={{
                  backgroundColor: pickerZone === z.id ? z.bg : 'white',
                  borderColor: pickerZone === z.id ? z.color : '#e5e5e5',
                  color: z.color,
                }}
              >
                {z.label}
              </button>
            ))}
          </div>

          {/* Shape grid */}
          <p className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-2">Modell</p>
          <div className="grid grid-cols-4 gap-2">
            {SHAPES.map(s => {
              const zone = zones.find(z => z.id === pickerZone)
              return (
                <button key={s.id} onClick={() => addTable(s)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-stone-50 active:scale-95 transition-all border border-stone-100 hover:border-stone-300">
                  <div style={{
                    width: s.shape === 'rect' ? 36 : s.shape === 'bar' && s.capacity === 2 ? 32 : 24,
                    height: s.shape === 'bar' ? 14 : s.shape === 'rect' ? 18 : 24,
                    backgroundColor: zone?.bg || '#fdf8f2',
                    border: `2px solid ${zone?.border || '#e8d9c0'}`,
                    borderRadius: s.shape === 'round' ? '50%' : s.shape === 'bar' ? '3px' : '5px',
                  }} />
                  <span className="text-[9px] text-stone-500 font-semibold text-center leading-tight">{s.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Canvas */}
        <div className="flex-1 overflow-auto" style={{ backgroundColor: '#ede8e0' }}>
          <div style={{ padding: 16 }}>
            <div
              ref={canvasRef}
              style={{ position: 'relative', width: CANVAS_W, height: CANVAS_H,
                backgroundColor: '#f8f4ee',
                backgroundImage: 'radial-gradient(circle, #c8b89a 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                borderRadius: 20,
                boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.06)',
                userSelect: 'none',
              }}
              onPointerMove={editMode ? handleCanvasMove : undefined}
              onPointerUp={editMode ? handleCanvasUp : undefined}
            >
              {/* Zone boxes — rendered first (below tables) */}
              {zones.map(zone => (
                <ZoneBox
                  key={zone.id}
                  zone={zone}
                  editMode={editMode}
                  onMove={handleZoneMove}
                  onResize={handleZoneResize}
                />
              ))}

              {/* Tables */}
              {tables.map(table => (
                <TableNode
                  key={table.id}
                  table={table}
                  selected={selected?.id === table.id}
                  editMode={editMode}
                  onDown={editMode ? (e) => handleTableDown(e, table.id) : undefined}
                  onClick={() => setSelectedId(prev => prev === table.id ? null : table.id)}
                  booking={bookingMap[table.id] || null}
                />
              ))}

              {/* Edit hint */}
              {editMode && (
                <div style={{
                  position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(59,31,10,0.7)', color: 'white', backdropFilter: 'blur(6px)',
                  fontSize: 10, fontWeight: 600, padding: '5px 14px', borderRadius: 20,
                  whiteSpace: 'nowrap', pointerEvents: 'none',
                }}>
                  Bereiche: Header ziehen = verschieben · Ecke ziehen = Größe ändern · Tische frei positionieren
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Side Panel ───────────────────────────────────────────────────── */}
        <div className="w-68 shrink-0 bg-white border-l border-stone-100 flex flex-col"
          style={{ width: 268, overflowY: 'auto' }}>

          {selected ? (
            <>
              <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-stone-400 font-semibold uppercase tracking-wider">Ausgewählt</p>
                  <p className="font-bold text-on-surface">T-{String(selected.number).padStart(2,'0')} · {selected.capacity}P</p>
                </div>
                <button onClick={() => setSelectedId(null)}
                  className="w-7 h-7 rounded-full hover:bg-stone-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              <div className="p-4 space-y-5 flex-1">

                {/* Status */}
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Status</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(STATUS_CFG).map(([k, v]) => (
                      <button key={k} onClick={() => updateStatus(selected.id, k)}
                        className="py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                        style={{
                          backgroundColor: selected.status === k ? v.bg : '#f5f5f4',
                          color: selected.status === k ? v.text : '#78716c',
                          border: `1.5px solid ${selected.status === k ? v.border : '#e5e5e5'}`,
                        }}
                      >{v.label}</button>
                    ))}
                  </div>
                </div>

                {/* Zone */}
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Bereich</p>
                  <div className="space-y-1">
                    {zones.map(z => (
                      <button key={z.id} onClick={() => changeZone(z.id)}
                        className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-left transition-all active:scale-95"
                        style={{
                          backgroundColor: selected.zone === z.id ? z.bg : '#f5f5f4',
                          color: selected.zone === z.id ? z.color : '#78716c',
                          border: `1.5px solid ${selected.zone === z.id ? z.border : '#e5e5e5'}`,
                        }}
                      >{z.label}</button>
                    ))}
                  </div>
                </div>

                {/* Shape (edit mode only) */}
                {editMode && (
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Form</p>
                    <div className="grid grid-cols-4 gap-1">
                      {SHAPES.map(s => {
                        const active = selected.shape === s.shape && selected.capacity === s.capacity
                        return (
                          <button key={s.id} onClick={() => changeShape(s.shape, s.capacity)}
                            className="flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all active:scale-95"
                            style={{
                              border: `1.5px solid ${active ? '#3b1f0a' : '#e5e5e5'}`,
                              backgroundColor: active ? '#f5f0e8' : 'white',
                            }}
                          >
                            <div style={{
                              width: s.shape === 'rect' ? 26 : s.shape === 'bar' && s.capacity === 2 ? 24 : 18,
                              height: s.shape === 'bar' ? 10 : s.shape === 'rect' ? 14 : 18,
                              backgroundColor: active ? '#c8a97a' : '#e5ddd2',
                              borderRadius: s.shape === 'round' ? '50%' : s.shape === 'bar' ? '3px' : '4px',
                            }} />
                            <span className="text-[8px] text-stone-500 leading-tight text-center">{s.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Bookings */}
                {(selected.bookings?.length || 0) > 0 && (
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Reservierungen</p>
                    {selected.bookings!.map(b => (
                      <div key={b.bookingCode} className="bg-stone-50 rounded-xl p-3 mb-2">
                        <div className="flex justify-between">
                          <span className="text-xs font-bold">{b.startTime}–{b.endTime}</span>
                          <span className="text-[10px] font-mono text-stone-400">{b.bookingCode}</span>
                        </div>
                        <p className="text-xs text-stone-600 mt-0.5">{b.guestName} · {b.guestCount}P</p>
                      </div>
                    ))}
                  </div>
                )}

                {editMode && (
                  <button onClick={deleteSelected}
                    className="w-full py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    style={{ backgroundColor: '#fff1f2', color: '#be123c', border: '1.5px solid #fecdd3' }}
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Tisch entfernen
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-stone-400">
              <span className="material-symbols-outlined text-5xl mb-3" style={{ color: '#d6ccbf' }}>table_restaurant</span>
              <p className="text-sm font-semibold text-stone-500">Tisch auswählen</p>
              <p className="text-xs mt-1 leading-relaxed">Klicken Sie auf einen Tisch für Details und Statusänderung</p>
              {editMode && (
                <div className="mt-5 text-xs text-left text-stone-400 bg-stone-50 rounded-xl p-4 space-y-2 leading-relaxed">
                  <p><b>Bereiche</b></p>
                  <p>↔ Header ziehen — verschieben</p>
                  <p>↘ Ecke ziehen — vergrößern/verkleinern</p>
                  <p className="mt-2"><b>Tische</b></p>
                  <p>✋ Tisch ziehen — positionieren</p>
                  <p>➕ Oben — neuen Tisch wählen</p>
                  <p>💾 Speichern nicht vergessen!</p>
                </div>
              )}
            </div>
          )}

          {/* Footer stats */}
          <div className="px-4 py-3 border-t border-stone-100 grid grid-cols-2 gap-1.5">
            {Object.entries(STATUS_CFG).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: v.dot }} />
                <span className="text-xs text-stone-500">{v.label}</span>
                <span className="text-xs font-bold text-stone-700 ml-auto">{counts[k as keyof typeof counts]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
