'use client'

import { useState, useEffect } from 'react'

interface MenuItem {
  id: string
  name: string
  category: string
  price: number
  isAvailable: boolean
}

interface CafeSettings {
  slotDuration: number
  bookingDuration: number
  confirmationMode: 'AUTO' | 'MANUAL'
  maxAutoConfirmGuests: number
  openTuFr: string
  closeTuFr: string
  openSaSo: string
  closeSaSo: string
  // Neukunden-Aktion
  firstTimePromoEnabled: boolean
  firstTimePromoType: 'PERCENT' | 'PRODUCT'
  firstTimePromoPercent: number
  firstTimePromoProductId: string | null
  firstTimePromoMessage: string
  // Restaurant Details
  restaurantName: string
  restaurantAddress: string
  restaurantPhone: string
  restaurantEmail: string
  restaurantWebsite: string
  restaurantGoogleMaps: string
  restaurantInstagram: string
  restaurantFacebook: string
  amenityOutdoor: boolean
  amenityWifi: boolean
  amenityKidFriendly: boolean
  amenityBarrierfree: boolean
  amenityParking: boolean
  amenityReservation: boolean
  amenityTakeaway: boolean
  amenityCreditCard: boolean
}

interface BlockedSlot {
  id: string
  date: string
  dayOfWeek: number | null
  startTime: string
  endTime: string
  reason: string
}

const DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

function genTimeOptions(from: string, to: string, step: number): string[] {
  const slots: string[] = []
  const [fh, fm] = from.split(':').map(Number)
  const [th, tm] = to.split(':').map(Number)
  let cur = fh * 60 + fm
  const end = th * 60 + tm
  while (cur <= end) {
    slots.push(`${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`)
    cur += step
  }
  return slots
}

export default function SettingsPage() {
  const [settings, setSettings]     = useState<CafeSettings>({
    slotDuration: 30, bookingDuration: 120,
    confirmationMode: 'AUTO', maxAutoConfirmGuests: 16,
    openTuFr: '10:00', closeTuFr: '20:00',
    openSaSo: '11:00', closeSaSo: '22:00',
    firstTimePromoEnabled: false, firstTimePromoType: 'PERCENT',
    firstTimePromoPercent: 10, firstTimePromoProductId: null,
    firstTimePromoMessage: 'Willkommen bei OMOI! Als Neukunde erhalten Sie einen besonderen Rabatt.',
    restaurantName: 'OMOI · 思い', restaurantAddress: 'Hauptstätter Str. 57, 70178 Stuttgart',
    restaurantPhone: '', restaurantEmail: '', restaurantWebsite: '',
    restaurantGoogleMaps: 'https://maps.app.goo.gl/Vy3wRgdSbauSvcxT9',
    restaurantInstagram: '', restaurantFacebook: '',
    amenityOutdoor: false, amenityWifi: true, amenityKidFriendly: false,
    amenityBarrierfree: false, amenityParking: false, amenityReservation: true,
    amenityTakeaway: false, amenityCreditCard: true,
  })
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [blocked, setBlocked]       = useState<BlockedSlot[]>([])
  const [saving, setSaving]         = useState(false)
  const [savedMsg, setSavedMsg]     = useState('')

  // New block form
  const [newBlock, setNewBlock] = useState({
    type: 'date',      // 'date' | 'weekday'
    date: '',
    dayOfWeek: '2',   // Tuesday default
    startTime: '09:00',
    endTime: '11:00',
    reason: '',
  })
  const [addingBlock, setAddingBlock] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/blocked-times').then(r => r.json()),
      fetch('/api/menu').then(r => r.json()).catch(() => ({ items: [] })),
    ]).then(([s, b, m]) => {
      if (s.settings) setSettings(prev => ({ ...prev, ...s.settings }))
      if (b.blockedSlots) setBlocked(b.blockedSlots)
      if (m.items) setMenuItems(m.items)
    }).catch(() => {})
  }, [])

  async function saveSettings() {
    setSaving(true)
    try {
      const res  = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (data.settings) setSettings(data.settings)
      setSavedMsg('Gespeichert ✓')
      setTimeout(() => setSavedMsg(''), 2500)
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  async function addBlock() {
    if (!newBlock.reason.trim() || newBlock.startTime >= newBlock.endTime) return
    try {
      const body: Record<string, unknown> = {
        startTime: newBlock.startTime,
        endTime:   newBlock.endTime,
        reason:    newBlock.reason,
      }
      if (newBlock.type === 'date') {
        body.date      = newBlock.date || new Date().toISOString().split('T')[0]
        body.dayOfWeek = null
      } else {
        body.date      = '*'
        body.dayOfWeek = parseInt(newBlock.dayOfWeek)
      }
      const res  = await fetch('/api/blocked-times', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.slot) setBlocked(prev => [...prev, data.slot])
      setNewBlock(prev => ({ ...prev, reason: '' }))
      setAddingBlock(false)
    } catch { /* ignore */ }
  }

  async function removeBlock(id: string) {
    setBlocked(prev => prev.filter(b => b.id !== id))
    await fetch(`/api/blocked-times?id=${id}`, { method: 'DELETE' })
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Einstellungen</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">Buchungsintervalle, Öffnungszeiten & Sperrzeiten</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-container text-white rounded-xl font-semibold text-sm active:scale-95 transition-all disabled:opacity-50 shadow-sm"
        >
          <span className="material-symbols-outlined text-base">{saving ? 'progress_activity' : 'save'}</span>
          {savedMsg || (saving ? 'Speichern…' : 'Speichern')}
        </button>
      </div>

      {/* ── Section 1: Booking slots ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center gap-3">
          <div className="w-9 h-9 bg-[#3b1f0a]/8 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-[#3b1f0a] text-[18px]">schedule</span>
          </div>
          <div>
            <h2 className="font-bold text-on-surface">Buchungsintervall</h2>
            <p className="text-xs text-on-surface-variant">Wie oft können Kunden Uhrzeiten wählen</p>
          </div>
        </div>
        <div className="p-6 space-y-6">

          {/* Slot duration */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-3">
              Zeitslot-Intervall (Minuten)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[5, 10, 15, 30, 60].map(min => (
                <button
                  key={min}
                  onClick={() => setSettings(s => ({ ...s, slotDuration: min }))}
                  className={`py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                    settings.slotDuration === min
                      ? 'bg-primary-container text-white shadow-md'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {min} min
                </button>
              ))}
            </div>
            <p className="text-xs text-stone-400 mt-2">
              Kunden sehen z.B. 09:00 · 09:{String(settings.slotDuration).padStart(2,'0')} · 09:{String(settings.slotDuration * 2).padStart(2,'0')} …
            </p>
          </div>

          {/* Booking duration */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-3">
              Standard-Buchungsdauer (Minuten)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[60, 90, 120, 180].map(min => (
                <button
                  key={min}
                  onClick={() => setSettings(s => ({ ...s, bookingDuration: min }))}
                  className={`py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                    settings.bookingDuration === min
                      ? 'bg-primary-container text-white shadow-md'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {min >= 60 ? `${min / 60}h${min % 60 ? ` ${min % 60}min` : ''}` : `${min} min`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: Confirmation mode ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified</span>
          </div>
          <div>
            <h2 className="font-bold text-on-surface">Bestätigung</h2>
            <p className="text-xs text-on-surface-variant">Automatisch nach Sitzkapazität oder manuell durch Admin</p>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                mode: 'AUTO' as const,
                icon: 'auto_awesome',
                title: 'Automatisch',
                text: 'Freie Kapazität prüfen und passende Buchungen sofort bestätigen.',
              },
              {
                mode: 'MANUAL' as const,
                icon: 'approval',
                title: 'Manuell',
                text: 'Neue Kundenbuchungen bleiben ausstehend, bis Admin bestätigt.',
              },
            ].map(item => (
              <button
                key={item.mode}
                type="button"
                onClick={() => setSettings(s => ({ ...s, confirmationMode: item.mode }))}
                className={`text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.99] ${
                  settings.confirmationMode === item.mode
                    ? 'border-primary-container bg-[#3b1f0a]/5'
                    : 'border-stone-100 bg-stone-50 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className={`material-symbols-outlined ${settings.confirmationMode === item.mode ? 'text-primary-container' : 'text-stone-500'}`}>
                    {item.icon}
                  </span>
                  <span className="font-bold text-on-surface">{item.title}</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">{item.text}</p>
              </button>
            ))}
          </div>

          <div className={settings.confirmationMode === 'AUTO' ? '' : 'opacity-50'}>
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-3">
              Automatisch bestätigen bis
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 12, 16, 20].map(count => (
                <button
                  key={count}
                  type="button"
                  disabled={settings.confirmationMode !== 'AUTO'}
                  onClick={() => setSettings(s => ({ ...s, maxAutoConfirmGuests: count }))}
                  className={`py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:cursor-not-allowed ${
                    settings.maxAutoConfirmGuests === count
                      ? 'bg-primary-container text-white shadow-md'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {count} Gäste
                </button>
              ))}
            </div>
            <p className="text-xs text-stone-400 mt-2">
              Standard: 16 Gäste, passend zu den zwei flexiblen 2er-Bereichen. Größere Gruppen bleiben zur Prüfung im Admin.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { label: '2x Tisch 4', value: 8 },
              { label: '3x Tisch 2', value: 6 },
              { label: 'Flex 5–8', value: 8 },
              { label: 'Flex 21–24', value: 8 },
              { label: 'Bar 30–35', value: 6 },
            ].map(item => (
              <div key={item.label} className="bg-surface-container-low rounded-xl px-3 py-3">
                <p className="text-lg font-bold text-on-surface">{item.value}</p>
                <p className="text-[11px] font-semibold text-on-surface-variant">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 2: Opening hours ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-blue-600 text-[18px]">storefront</span>
          </div>
          <div>
            <h2 className="font-bold text-on-surface">Öffnungszeiten</h2>
            <p className="text-xs text-on-surface-variant">Buchbare Zeiten für Kunden</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {[
            { label: 'Dienstag – Freitag', open: 'openTuFr', close: 'closeTuFr' },
            { label: 'Samstag – Sonntag',  open: 'openSaSo', close: 'closeSaSo' },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-4 flex-wrap">
              <span className="w-44 text-sm font-medium text-on-surface shrink-0">{row.label}</span>
              <div className="flex items-center gap-2">
                <select
                  value={settings[row.open as keyof CafeSettings] as string}
                  onChange={e => setSettings(s => ({ ...s, [row.open]: e.target.value }))}
                  className="bg-stone-100 rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary-container border-none"
                >
                  {genTimeOptions('06:00', '14:00', 30).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <span className="text-on-surface-variant">–</span>
                <select
                  value={settings[row.close as keyof CafeSettings] as string}
                  onChange={e => setSettings(s => ({ ...s, [row.close]: e.target.value }))}
                  className="bg-stone-100 rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary-container border-none"
                >
                  {genTimeOptions('14:00', '23:00', 30).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-4">
            <span className="w-44 text-sm font-medium text-error shrink-0">Montag</span>
            <span className="px-3 py-2 bg-red-50 text-error text-sm font-semibold rounded-xl">Ruhetag (geschlossen)</span>
          </div>
        </div>
      </div>

      {/* ── Section 3: Blocked slots ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-red-500 text-[18px]">block</span>
            </div>
            <div>
              <h2 className="font-bold text-on-surface">Gesperrte Zeitfenster</h2>
              <p className="text-xs text-on-surface-variant">Kunden können in diesen Zeiten nicht buchen</p>
            </div>
          </div>
          <button
            onClick={() => setAddingBlock(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#3b1f0a] text-white rounded-xl text-xs font-bold active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-sm">{addingBlock ? 'close' : 'add'}</span>
            {addingBlock ? 'Abbrechen' : 'Sperren'}
          </button>
        </div>

        {/* Add block form */}
        {addingBlock && (
          <div className="px-6 py-5 bg-stone-50 border-b border-stone-100 space-y-4">
            {/* Type selector */}
            <div className="flex gap-2">
              {['date', 'weekday'].map(t => (
                <button key={t} onClick={() => setNewBlock(b => ({ ...b, type: t }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${newBlock.type === t ? 'bg-[#3b1f0a] text-white' : 'bg-stone-200 text-stone-600 hover:bg-stone-300'}`}
                >
                  {t === 'date' ? 'Bestimmtes Datum' : 'Wochentag (wiederkehrend)'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Date or Weekday */}
              {newBlock.type === 'date' ? (
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Datum</label>
                  <input type="date" value={newBlock.date}
                    onChange={e => setNewBlock(b => ({ ...b, date: e.target.value }))}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Wochentag</label>
                  <select value={newBlock.dayOfWeek}
                    onChange={e => setNewBlock(b => ({ ...b, dayOfWeek: e.target.value }))}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm"
                  >
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Grund</label>
                <input type="text" placeholder="z.B. Veranstaltung, Überfüllt …" value={newBlock.reason}
                  onChange={e => setNewBlock(b => ({ ...b, reason: e.target.value }))}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm"
                />
              </div>

              {/* Start time */}
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Von</label>
                <select value={newBlock.startTime}
                  onChange={e => setNewBlock(b => ({ ...b, startTime: e.target.value }))}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm"
                >
                  {genTimeOptions('06:00', '22:00', 15).map(t => <option key={t} value={t}>{t} Uhr</option>)}
                </select>
              </div>

              {/* End time */}
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Bis</label>
                <select value={newBlock.endTime}
                  onChange={e => setNewBlock(b => ({ ...b, endTime: e.target.value }))}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm"
                >
                  {genTimeOptions('06:30', '23:00', 15).map(t => <option key={t} value={t}>{t} Uhr</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={addBlock}
              disabled={!newBlock.reason.trim() || newBlock.startTime >= newBlock.endTime}
              className="w-full py-3 bg-red-600 text-white font-bold rounded-xl text-sm active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">block</span>
              Zeitfenster sperren
            </button>
          </div>
        )}

        {/* Blocked list */}
        {blocked.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <span className="material-symbols-outlined text-4xl text-stone-200 mb-2">lock_open</span>
            <p className="text-sm text-on-surface-variant">Keine gesperrten Zeitfenster</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {blocked.map(slot => (
              <div key={slot.id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-9 h-9 shrink-0 bg-red-50 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-500 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-on-surface">{slot.reason}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {slot.dayOfWeek !== null
                      ? `Jeden ${DAYS[slot.dayOfWeek]}`
                      : slot.date === '*' ? 'Jeden Tag' : new Date(slot.date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
                    }
                    {' · '}{slot.startTime} – {slot.endTime} Uhr
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold border border-red-100 shrink-0">
                  {slot.startTime}–{slot.endTime}
                </span>
                <button
                  onClick={() => removeBlock(slot.id)}
                  className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Sperre aufheben"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 4: Neukunden-Aktion ─────────────────────────────── */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-600" style={{ fontVariationSettings: "'FILL' 1" }}>redeem</span>
            </div>
            <div>
              <h2 className="font-bold text-on-surface">Neukunden-Aktion</h2>
              <p className="text-xs text-on-surface-variant">Ưu đãi cho khách đặt bàn lần đầu</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.firstTimePromoEnabled}
              onChange={e => setSettings(s => ({ ...s, firstTimePromoEnabled: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
          </label>
        </div>

        {settings.firstTimePromoEnabled && (
          <div className="p-6 space-y-5">
            {/* Promo type */}
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Art der Aktion</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setSettings(s => ({ ...s, firstTimePromoType: 'PERCENT' }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 border-2 ${
                    settings.firstTimePromoType === 'PERCENT'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-stone-200 bg-white text-stone-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">percent</span>
                  Rabatt %
                </button>
                <button
                  onClick={() => setSettings(s => ({ ...s, firstTimePromoType: 'PRODUCT' }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 border-2 ${
                    settings.firstTimePromoType === 'PRODUCT'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-stone-200 bg-white text-stone-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">local_cafe</span>
                  Gratis-Produkt
                </button>
              </div>
            </div>

            {/* Percent config */}
            {settings.firstTimePromoType === 'PERCENT' && (
              <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Rabatt</p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1" max="100"
                    value={settings.firstTimePromoPercent}
                    onChange={e => setSettings(s => ({ ...s, firstTimePromoPercent: parseInt(e.target.value) || 0 }))}
                    className="w-24 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-mono text-center"
                  />
                  <span className="text-lg font-bold text-stone-400">%</span>
                  <span className="text-xs text-stone-400">auf die gesamte Rechnung</span>
                </div>
              </div>
            )}

            {/* Product config */}
            {settings.firstTimePromoType === 'PRODUCT' && (
              <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Gratis-Produkt wählen</p>
                <select
                  value={settings.firstTimePromoProductId || ''}
                  onChange={e => setSettings(s => ({ ...s, firstTimePromoProductId: e.target.value || null }))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm"
                >
                  <option value="">— Produkt auswählen —</option>
                  {menuItems.filter(m => m.isAvailable).map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({(m.price / 100).toFixed(2)} €)</option>
                  ))}
                </select>
                {menuItems.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Keine Produkte gefunden. Bitte Menü-Daten anlegen.</p>
                )}
              </div>
            )}

            {/* Message */}
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Nachricht für den Gast</p>
              <textarea
                value={settings.firstTimePromoMessage}
                onChange={e => setSettings(s => ({ ...s, firstTimePromoMessage: e.target.value }))}
                rows={3}
                placeholder="Willkommen bei OMOI!..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm resize-none"
              />
            </div>

            {/* Preview */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border-2 border-dashed border-emerald-200 p-5 text-center">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">Vorschau für den Gast</p>
              <span className="material-symbols-outlined text-3xl text-emerald-500 mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>redeem</span>
              <p className="font-bold text-emerald-800">
                {settings.firstTimePromoType === 'PERCENT'
                  ? `${settings.firstTimePromoPercent}% Rabatt`
                  : `Gratis: ${menuItems.find(m => m.id === settings.firstTimePromoProductId)?.name || '(Produkt wählen)'}`
                }
              </p>
              <p className="text-xs text-emerald-600 mt-1 max-w-xs mx-auto">{settings.firstTimePromoMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Section 5: Restaurant-Details ──────────────────── */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-outline-variant/20 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-blue-600" style={{ fontVariationSettings: "'FILL' 1" }}>storefront</span>
          </div>
          <div>
            <h2 className="font-bold text-on-surface">Restaurant-Details</h2>
            <p className="text-xs text-on-surface-variant">Kontaktinfo, Links & Ausstattung für die Startseite</p>
          </div>
        </div>
        <div className="p-6 space-y-5">
          {/* Name + Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Name</p>
              <input value={settings.restaurantName} onChange={e => setSettings(s => ({ ...s, restaurantName: e.target.value }))}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm" placeholder="OMOI" />
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Adresse</p>
              <input value={settings.restaurantAddress} onChange={e => setSettings(s => ({ ...s, restaurantAddress: e.target.value }))}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm" placeholder="Straße, PLZ Stadt" />
            </div>
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Telefon</p>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-base">call</span>
                <input value={settings.restaurantPhone} onChange={e => setSettings(s => ({ ...s, restaurantPhone: e.target.value }))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2.5 text-sm" placeholder="+49 711 ..." />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">E-Mail</p>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-base">mail</span>
                <input value={settings.restaurantEmail} onChange={e => setSettings(s => ({ ...s, restaurantEmail: e.target.value }))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2.5 text-sm" placeholder="info@omoi.de" />
              </div>
            </div>
          </div>

          {/* Website + Google Maps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Website</p>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-base">language</span>
                <input value={settings.restaurantWebsite} onChange={e => setSettings(s => ({ ...s, restaurantWebsite: e.target.value }))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2.5 text-sm" placeholder="https://..." />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Google Maps Link</p>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-base">map</span>
                <input value={settings.restaurantGoogleMaps} onChange={e => setSettings(s => ({ ...s, restaurantGoogleMaps: e.target.value }))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2.5 text-sm" placeholder="https://maps.app.goo.gl/..." />
              </div>
            </div>
          </div>

          {/* Social */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Instagram</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-bold">@</span>
                <input value={settings.restaurantInstagram} onChange={e => setSettings(s => ({ ...s, restaurantInstagram: e.target.value }))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2.5 text-sm" placeholder="omoi.cafe" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Facebook</p>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-base">thumb_up</span>
                <input value={settings.restaurantFacebook} onChange={e => setSettings(s => ({ ...s, restaurantFacebook: e.target.value }))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2.5 text-sm" placeholder="https://facebook.com/..." />
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Ausstattung & Services</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: 'amenityOutdoor', icon: 'deck', label: 'Außenbereich' },
                { key: 'amenityWifi', icon: 'wifi', label: 'WLAN' },
                { key: 'amenityKidFriendly', icon: 'child_care', label: 'Kinderfreundlich' },
                { key: 'amenityBarrierfree', icon: 'accessible', label: 'Barrierefrei' },
                { key: 'amenityParking', icon: 'local_parking', label: 'Parkplatz' },
                { key: 'amenityReservation', icon: 'event_seat', label: 'Reservierung' },
                { key: 'amenityTakeaway', icon: 'takeout_dining', label: 'Takeaway' },
                { key: 'amenityCreditCard', icon: 'credit_card', label: 'Kartenzahlung' },
              ].map(a => {
                const active = settings[a.key as keyof CafeSettings] as boolean
                return (
                  <button key={a.key} type="button"
                    onClick={() => setSettings(s => ({ ...s, [a.key]: !active }))}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 border ${
                      active ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-stone-200 text-stone-400'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{a.icon}</span>
                    {a.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
