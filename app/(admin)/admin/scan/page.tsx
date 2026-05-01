'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>
}

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorLike

interface Booking {
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
  table: { id: string; number: number; zone: string; name: string } | null
  assignedTables?: Array<{ table: { id: string; number: number; zone: string; name: string } }>
  preOrders: Array<{ quantity: number; menuItem: { name: string; price: number } }>
}

const statusLabels: Record<string, string> = {
  PENDING: 'Ausstehend',
  CONFIRMED: 'Bestätigt',
  SEATED: 'Am Tisch',
  COMPLETED: 'Fertig',
  CANCELLED: 'Storniert',
  NO_SHOW: 'No-show',
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  CONFIRMED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  SEATED: 'bg-blue-100 text-blue-700 border-blue-200',
  COMPLETED: 'bg-stone-100 text-stone-600 border-stone-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
  NO_SHOW: 'bg-purple-100 text-purple-700 border-purple-200',
}

const zoneLabels: Record<string, string> = {
  WINDOW: 'Fenster',
  OUTDOOR: 'Außen',
  QUIET: 'Ruhezone',
  WORKSPACE: 'Arbeitsplatz',
  BAR: 'Bar',
}

function getBarcodeDetector() {
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector
}

function extractBookingCode(rawValue: string) {
  const value = rawValue.trim()

  try {
    const url = new URL(value, window.location.origin)
    const code = url.searchParams.get('code')
    if (code) return code.trim().toUpperCase()
  } catch {
    // Plain booking codes are expected, URLs are only a convenience.
  }

  const match = value.match(/OM\d{4}-\d{3}/i)
  return match ? match[0].toUpperCase() : value.toUpperCase()
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getAssignedTables(booking: Booking) {
  const assigned = booking.assignedTables?.map((item) => item.table) || []
  return assigned.length > 0 ? assigned : booking.table ? [booking.table] : []
}

function tableLabel(booking: Booking) {
  const assigned = getAssignedTables(booking)
  if (assigned.length === 0) return ''
  return assigned.map((table) => `T-${String(table.number).padStart(2, '0')}`).join(', ')
}

export default function AdminScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanActiveRef = useRef(false)

  const [manualCode, setManualCode] = useState('')
  const [booking, setBooking] = useState<Booking | null>(null)
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const stopScanner = useCallback(() => {
    scanActiveRef.current = false
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setScanning(false)
  }, [])

  useEffect(() => stopScanner, [stopScanner])

  async function lookupBooking(rawValue: string) {
    const code = extractBookingCode(rawValue)

    if (!/^OM\d{4}-\d{3}$/i.test(code)) {
      setBooking(null)
      setError('Kein gültiger Buchungscode erkannt')
      setMessage('')
      return
    }

    setManualCode(code)
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const res = await fetch(`/api/bookings/${code}`)
      const data = await res.json()

      if (!res.ok || !data.booking) {
        setBooking(null)
        setError(data.error || 'Reservierung nicht gefunden')
        return
      }

      setBooking(data.booking)
      setMessage(`Reservierung ${code} gefunden`)
      stopScanner()
    } catch {
      setBooking(null)
      setError('Verbindung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  async function startScanner() {
    setError('')
    setMessage('')

    const Detector = getBarcodeDetector()
    if (!Detector) {
      setError('QR-Scan wird von diesem Browser nicht unterstützt. Bitte Code manuell eingeben.')
      return
    }

    try {
      stopScanner()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      scanActiveRef.current = true
      setScanning(true)

      const video = videoRef.current
      if (!video) return

      video.srcObject = stream
      await video.play()

      const detector = new Detector({ formats: ['qr_code'] })

      const scanFrame = async () => {
        if (!scanActiveRef.current || !videoRef.current) return

        try {
          if (videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const codes = await detector.detect(videoRef.current)
            const rawValue = codes[0]?.rawValue
            if (rawValue) {
              await lookupBooking(rawValue)
              return
            }
          }
        } catch {
          setError('QR-Code konnte nicht gelesen werden')
        }

        if (scanActiveRef.current) window.setTimeout(scanFrame, 250)
      }

      scanFrame()
    } catch {
      stopScanner()
      setError('Kamera konnte nicht geöffnet werden. Bitte Berechtigung prüfen oder Code manuell eingeben.')
    }
  }

  async function updateStatus(status: string) {
    if (!booking) return

    setUpdating(true)
    setError('')
    setMessage('')

    try {
      const res = await fetch(`/api/bookings/${booking.bookingCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()

      if (!res.ok || !data.booking) {
        setError(data.error || 'Status konnte nicht geändert werden')
        return
      }

      setBooking((current) => current ? {
        ...current,
        status: data.booking.status,
        table: data.booking.table,
        assignedTables: data.booking.assignedTables,
      } : current)
      setMessage(`Status: ${statusLabels[data.booking.status] || data.booking.status}`)
    } catch {
      setError('Status konnte nicht geändert werden')
    } finally {
      setUpdating(false)
    }
  }

  const preOrderTotal = booking?.preOrders.reduce(
    (sum, po) => sum + po.menuItem.price * po.quantity,
    0
  ) || 0
  const assignedTables = booking ? getAssignedTables(booking) : []

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">QR-Scan</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">Reservierung schnell finden und Gäste einchecken</p>
        </div>
        <Link
          href="/admin/bookings"
          className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-stone-50 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-base">event_available</span>
          Reservierungen
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-bold text-on-surface">Scanner</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">QR-Code auf der Bestätigungsseite scannen</p>
            </div>
            <div className="flex gap-2">
              {scanning ? (
                <button
                  onClick={stopScanner}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">stop_circle</span>
                  Stoppen
                </button>
              ) : (
                <button
                  onClick={startScanner}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary-container text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                  Kamera starten
                </button>
              )}
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="relative aspect-[4/3] bg-[#1f1b19] rounded-2xl overflow-hidden flex items-center justify-center">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {!scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 text-center px-6">
                  <span className="material-symbols-outlined text-5xl mb-3">qr_code_2</span>
                  <p className="text-sm font-semibold">Kamera starten, dann QR-Code mittig halten</p>
                </div>
              )}
              {scanning && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-56 h-56 border-4 border-white/80 rounded-3xl shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
                </div>
              )}
            </div>

            <div className="bg-surface-container-low rounded-2xl p-4">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-2">
                Manuell suchen
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') lookupBooking(manualCode)
                  }}
                  placeholder="OM2604-005"
                  className="flex-1 bg-white border border-outline-variant rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-primary-container"
                />
                <button
                  onClick={() => lookupBooking(manualCode)}
                  disabled={loading}
                  className="px-5 py-3 bg-[#3b1f0a] text-white rounded-xl text-sm font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">{loading ? 'progress_activity' : 'search'}</span>
                  Suchen
                </button>
              </div>
            </div>

            {message && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-base">check_circle</span>
                {message}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden min-h-[420px]">
          <div className="px-6 py-4 bg-surface-container-low border-b border-stone-100">
            <h2 className="font-bold text-on-surface">Reservierung</h2>
          </div>

          {!booking ? (
            <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center p-8">
              <span className="material-symbols-outlined text-5xl text-stone-300 mb-3">confirmation_number</span>
              <p className="font-semibold text-on-surface">Noch keine Reservierung geladen</p>
              <p className="text-sm text-on-surface-variant mt-1">QR scannen oder Buchungscode eingeben.</p>
            </div>
          ) : (
            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Buchungscode</p>
                  <p className="font-mono font-bold text-primary-container text-2xl">{booking.bookingCode}</p>
                </div>
                <span className={`px-3 py-1 rounded-full border text-[11px] font-bold ${statusColors[booking.status] || statusColors.PENDING}`}>
                  {statusLabels[booking.status] || booking.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-on-primary-container">person</span>
                  <div>
                    <p className="font-semibold text-on-surface">{booking.guestName}</p>
                    <p className="text-sm text-on-surface-variant">{booking.guestPhone}</p>
                    {booking.guestEmail && <p className="text-xs text-on-surface-variant">{booking.guestEmail}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-container rounded-xl p-3">
                    <p className="text-xs text-on-surface-variant mb-1">Datum</p>
                    <p className="font-semibold text-on-surface text-sm">{formatDate(booking.date)}</p>
                  </div>
                  <div className="bg-surface-container rounded-xl p-3">
                    <p className="text-xs text-on-surface-variant mb-1">Uhrzeit</p>
                    <p className="font-semibold text-on-surface text-sm">{booking.startTime} – {booking.endTime}</p>
                  </div>
                  <div className="bg-surface-container rounded-xl p-3">
                    <p className="text-xs text-on-surface-variant mb-1">Gäste</p>
                    <p className="font-semibold text-on-surface text-sm">{booking.guestCount} Personen</p>
                  </div>
                  <div className="bg-surface-container rounded-xl p-3">
                    <p className="text-xs text-on-surface-variant mb-1">Tisch</p>
                    {assignedTables.length > 0 ? (
                      <p className="font-semibold text-on-surface text-sm">
                        {tableLabel(booking)}
                        <span className="block text-xs font-normal text-on-surface-variant mt-0.5">
                          {assignedTables.length > 1 ? `${assignedTables.length} Tische` : zoneLabels[assignedTables[0].zone] || assignedTables[0].zone}
                        </span>
                      </p>
                    ) : (
                      <p className="font-semibold text-amber-700 text-sm">Noch zuzuweisen</p>
                    )}
                  </div>
                </div>

                {booking.specialNote && (
                  <div className="bg-secondary-container/30 rounded-xl p-3">
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Hinweise</p>
                    <p className="text-sm text-on-surface">{booking.specialNote}</p>
                  </div>
                )}

                {booking.preOrders.length > 0 && (
                  <div className="bg-surface-container rounded-xl p-3">
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">Vorbestellung</p>
                    {booking.preOrders.map((po, index) => (
                      <div key={index} className="flex justify-between text-xs py-0.5">
                        <span>{po.quantity}x {po.menuItem.name}</span>
                        <span className="text-on-surface-variant">{(po.menuItem.price * po.quantity / 100).toFixed(2)} €</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-bold border-t border-outline-variant/30 mt-2 pt-2">
                      <span>Gesamt</span>
                      <span>{(preOrderTotal / 100).toFixed(2)} €</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {booking.status === 'PENDING' && (
                  <button
                    onClick={() => updateStatus('CONFIRMED')}
                    disabled={updating}
                    className="py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">check</span>
                    Bestätigen
                  </button>
                )}
                {booking.status !== 'SEATED' && booking.status !== 'COMPLETED' && (
                  <button
                    onClick={() => updateStatus('SEATED')}
                    disabled={updating || assignedTables.length === 0}
                    className="py-3 bg-blue-600 text-white rounded-xl text-sm font-bold active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    title={assignedTables.length === 0 ? 'Erst Tisch zuweisen' : 'Einchecken'}
                  >
                    <span className="material-symbols-outlined text-base">chair</span>
                    Einchecken
                  </button>
                )}
                {booking.status === 'SEATED' && (
                  <button
                    onClick={() => updateStatus('COMPLETED')}
                    disabled={updating}
                    className="py-3 bg-stone-700 text-white rounded-xl text-sm font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">done_all</span>
                    Abschließen
                  </button>
                )}
                <button
                  onClick={() => updateStatus('NO_SHOW')}
                  disabled={updating}
                  className="py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">person_off</span>
                  No-show
                </button>
              </div>

              {assignedTables.length === 0 && (
                <Link
                  href="/admin/bookings"
                  className="w-full py-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-sm font-bold active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">table_restaurant</span>
                  Tisch zuweisen
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
