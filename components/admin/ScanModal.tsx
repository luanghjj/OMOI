'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

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
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ausstehend', CONFIRMED: 'Bestätigt', SEATED: 'Am Tisch',
  COMPLETED: 'Fertig', CANCELLED: 'Storniert', NO_SHOW: 'No-show',
}
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  SEATED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-stone-100 text-stone-600',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-purple-100 text-purple-700',
}

function getBarcodeDetector() {
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector
}

function extractCode(raw: string) {
  const v = raw.trim()
  try {
    const url = new URL(v, window.location.origin)
    const c = url.searchParams.get('code')
    if (c) return c.trim().toUpperCase()
  } catch { /* plain code */ }
  const m = v.match(/OM\d{4}-\d{3}/i)
  return m ? m[0].toUpperCase() : v.toUpperCase()
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

interface Props { onClose: () => void }

export default function ScanModal({ onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanActiveRef = useRef(false)

  const [manualCode, setManualCode] = useState('')
  const [booking, setBooking] = useState<Booking | null>(null)
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const stopScanner = useCallback(() => {
    scanActiveRef.current = false
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setScanning(false)
  }, [])

  // Stop camera on unmount
  useEffect(() => () => stopScanner(), [stopScanner])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { stopScanner(); onClose() } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [stopScanner, onClose])

  async function lookupBooking(raw: string) {
    const code = extractCode(raw)
    if (!/^OM\d{4}-\d{3}$/i.test(code)) {
      setError('Kein gültiger Buchungscode erkannt')
      return
    }
    setManualCode(code)
    setLoading(true)
    setError('')
    setSuccessMsg('')
    try {
      const res = await fetch(`/api/bookings/${code}`)
      const data = await res.json()
      if (!res.ok || !data.booking) { setError(data.error || 'Nicht gefunden'); return }
      setBooking(data.booking)
      stopScanner()
    } catch { setError('Verbindung fehlgeschlagen') }
    finally { setLoading(false) }
  }

  async function startScanner() {
    setError('')
    setBooking(null)
    const Detector = getBarcodeDetector()
    if (!Detector) {
      setError('QR-Scan nicht unterstützt — bitte Code manuell eingeben.')
      return
    }
    try {
      stopScanner()
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      streamRef.current = stream
      scanActiveRef.current = true
      setScanning(true)
      const video = videoRef.current!
      video.srcObject = stream
      await video.play()
      const detector = new Detector({ formats: ['qr_code'] })
      const scanFrame = async () => {
        if (!scanActiveRef.current || !videoRef.current) return
        try {
          if (videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const codes = await detector.detect(videoRef.current)
            if (codes[0]?.rawValue) { await lookupBooking(codes[0].rawValue); return }
          }
        } catch { /* ignore frame errors */ }
        if (scanActiveRef.current) window.setTimeout(scanFrame, 250)
      }
      scanFrame()
    } catch { stopScanner(); setError('Kamera konnte nicht geöffnet werden.') }
  }

  async function updateStatus(status: string) {
    if (!booking) return
    setUpdating(true)
    setError('')
    try {
      const res = await fetch(`/api/bookings/${booking.bookingCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Fehler'); return }
      setBooking(b => b ? { ...b, status: data.booking.status } : b)
      setSuccessMsg(`✓ Status: ${STATUS_LABELS[data.booking.status]}`)
    } catch { setError('Fehler beim Aktualisieren') }
    finally { setUpdating(false) }
  }

  const tables = booking?.assignedTables?.map(a => a.table) || (booking?.table ? [booking.table] : [])

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={() => { stopScanner(); onClose() }}>
      <div className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#3b1f0a] flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-lg">qr_code_scanner</span>
            </div>
            <div>
              <h2 className="font-black text-[#3b1f0a] text-base">QR-Scan</h2>
              <p className="text-xs text-stone-400">Gast einchecken</p>
            </div>
          </div>
          <button onClick={() => { stopScanner(); onClose() }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400 transition-colors">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">

          {/* Camera area */}
          <div className="relative aspect-video bg-[#1a1512] rounded-2xl overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            {!scanning && !booking && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 gap-3">
                <span className="material-symbols-outlined text-5xl">qr_code_2</span>
                <p className="text-sm font-medium">Kamera starten, QR-Code scannen</p>
              </div>
            )}
            {scanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-44 h-44 border-4 border-white/90 rounded-2xl shadow-[0_0_0_999px_rgba(0,0,0,0.4)]" />
              </div>
            )}
            {booking && !scanning && (
              <div className="absolute inset-0 bg-[#1a1512]/90 flex items-center justify-center">
                <div className="text-center text-white">
                  <span className="material-symbols-outlined text-4xl text-emerald-400">check_circle</span>
                  <p className="font-bold mt-1">{booking.bookingCode}</p>
                </div>
              </div>
            )}
          </div>

          {/* Camera controls */}
          <div className="flex gap-2">
            {scanning ? (
              <button onClick={stopScanner}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-bold">
                <span className="material-symbols-outlined text-base">stop_circle</span>Stoppen
              </button>
            ) : (
              <button onClick={startScanner}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#3b1f0a] text-white rounded-xl text-sm font-bold hover:bg-[#5a3018] transition-colors">
                <span className="material-symbols-outlined text-base">photo_camera</span>Kamera starten
              </button>
            )}
            {booking && (
              <button onClick={() => { setBooking(null); setManualCode(''); setSuccessMsg('') }}
                className="flex items-center gap-1 px-4 py-2.5 border border-stone-200 rounded-xl text-sm font-semibold text-stone-600">
                <span className="material-symbols-outlined text-base">refresh</span>Neu
              </button>
            )}
          </div>

          {/* Manual input */}
          <div className="flex gap-2">
            <input value={manualCode}
              onChange={e => setManualCode(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === 'Enter') lookupBooking(manualCode) }}
              placeholder="OM2604-001"
              className="flex-1 px-4 py-2.5 bg-[#faf6f0] border border-[#e8dcc8] rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#C4975C]/30" />
            <button onClick={() => lookupBooking(manualCode)} disabled={loading}
              className="px-4 py-2.5 bg-[#3b1f0a] text-white rounded-xl text-sm font-bold disabled:opacity-50">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> : <span className="material-symbols-outlined text-base">search</span>}
            </button>
          </div>

          {/* Error / Success */}
          {error && <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-100 rounded-xl px-4 py-3 text-sm"><span className="material-symbols-outlined text-base">error</span>{error}</div>}
          {successMsg && <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl px-4 py-3 text-sm font-bold"><span className="material-symbols-outlined text-base">check_circle</span>{successMsg}</div>}

          {/* Booking result */}
          {booking && (
            <div className="bg-[#faf6f0] border border-[#e8dcc8] rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-black text-[#3b1f0a] text-base">{booking.guestName}</p>
                  <p className="text-xs text-stone-400 font-mono mt-0.5">{booking.bookingCode}</p>
                </div>
                <span className={'text-xs font-bold px-2.5 py-1 rounded-full ' + (STATUS_COLORS[booking.status] || 'bg-stone-100 text-stone-600')}>
                  {STATUS_LABELS[booking.status] || booking.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { icon: '📅', label: formatDate(booking.date) },
                  { icon: '🕐', label: booking.startTime + ' Uhr' },
                  { icon: '👥', label: booking.guestCount + ' Pers.' },
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-xl py-2 px-1">
                    <p className="text-base">{item.icon}</p>
                    <p className="text-xs font-semibold text-[#3b1f0a] mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>

              {tables.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {tables.map(t => (
                    <span key={t.id} className="bg-[#3b1f0a] text-white text-xs font-bold px-3 py-1 rounded-full">
                      T-{String(t.number).padStart(2, '0')}
                    </span>
                  ))}
                </div>
              )}

              {booking.specialNote && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-800">
                  📝 {booking.specialNote}
                </div>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {booking.status === 'CONFIRMED' && (
                  <button onClick={() => updateStatus('SEATED')} disabled={updating}
                    className="col-span-2 flex items-center justify-center gap-2 py-3 bg-[#3b1f0a] text-white rounded-xl font-bold text-sm disabled:opacity-60">
                    <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>table_restaurant</span>
                    {updating ? 'Speichern…' : 'Gast eincheck­en (Am Tisch)'}
                  </button>
                )}
                {booking.status === 'SEATED' && (
                  <button onClick={() => updateStatus('COMPLETED')} disabled={updating}
                    className="col-span-2 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-60">
                    <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    {updating ? 'Speichern…' : 'Abschließen'}
                  </button>
                )}
                {(booking.status === 'CONFIRMED' || booking.status === 'SEATED') && (
                  <button onClick={() => updateStatus('NO_SHOW')} disabled={updating}
                    className="flex items-center justify-center gap-1.5 py-2.5 border border-stone-200 text-stone-500 rounded-xl text-sm font-semibold disabled:opacity-60">
                    <span className="material-symbols-outlined text-base">person_off</span>No-show
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
