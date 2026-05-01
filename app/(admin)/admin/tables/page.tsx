'use client'

import { useState, useEffect, useCallback } from 'react'

interface Table {
  id: string
  number: number
  name: string
  zone: string
  capacity: number
  hasOutlet: boolean
  hasNaturalLight: boolean
  isActive: boolean
  status: string
}

const zones = [
  { value: 'WINDOW',    label: 'Fenster',      icon: 'window',          color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'OUTDOOR',   label: 'Außen',         icon: 'deck',            color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'QUIET',     label: 'Ruhezone',      icon: 'volume_off',      color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { value: 'WORKSPACE', label: 'Arbeitsplatz',  icon: 'laptop_mac',      color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'BAR',       label: 'Bar',           icon: 'local_bar',       color: 'bg-rose-50 text-rose-700 border-rose-200' },
]

const statusLabels: Record<string, { label: string; color: string }> = {
  EMPTY:    { label: 'Frei',     color: 'bg-emerald-100 text-emerald-700' },
  BOOKED:   { label: 'Reserviert', color: 'bg-amber-100 text-amber-700' },
  SEATED:   { label: 'Besetzt',  color: 'bg-blue-100 text-blue-700' },
  CLEANING: { label: 'Reinigung', color: 'bg-stone-100 text-stone-600' },
}

function getZone(z: string) { return zones.find(zone => zone.value === z) || zones[0] }

const emptyForm = { number: '', name: '', zone: 'WINDOW', capacity: '2', hasOutlet: false, hasNaturalLight: false }

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filterZone, setFilterZone] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/tables?all=true')
      const data = await res.json()
      setTables(data.tables || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchTables() }, [fetchTables])

  async function handleSave() {
    const num = parseInt(form.number)
    const cap = parseInt(form.capacity)
    if (!num || !form.name.trim() || !cap) {
      setError('Bitte alle Pflichtfelder ausfüllen')
      return
    }
    setError('')
    setSaving(true)

    try {
      if (editingId) {
        // Update
        const res = await fetch(`/api/tables/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number: num, name: form.name, zone: form.zone, capacity: cap, hasOutlet: form.hasOutlet, hasNaturalLight: form.hasNaturalLight }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'Fehler'); return }
      } else {
        // Create
        const res = await fetch('/api/tables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number: num, name: form.name, zone: form.zone, capacity: cap, hasOutlet: form.hasOutlet, hasNaturalLight: form.hasNaturalLight }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'Fehler'); return }
      }
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)
      fetchTables()
    } catch { setError('Verbindung fehlgeschlagen') }
    finally { setSaving(false) }
  }

  async function toggleActive(id: string, currentlyActive: boolean) {
    await fetch(`/api/tables/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !currentlyActive }),
    })
    fetchTables()
  }

  function startEdit(table: Table) {
    setForm({
      number: String(table.number),
      name: table.name,
      zone: table.zone,
      capacity: String(table.capacity),
      hasOutlet: table.hasOutlet,
      hasNaturalLight: table.hasNaturalLight,
    })
    setEditingId(table.id)
    setShowForm(true)
    setError('')
  }

  const filtered = tables.filter(t => {
    if (!showInactive && !t.isActive) return false
    if (filterZone && t.zone !== filterZone) return false
    return true
  })

  const activeCount = tables.filter(t => t.isActive).length
  const totalCapacity = tables.filter(t => t.isActive).reduce((s, t) => s + t.capacity, 0)

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Tischverwaltung</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {activeCount} aktive Tische · {totalCapacity} Sitzplätze
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); setError('') }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-container text-white rounded-xl text-sm font-bold active:scale-95 transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Neuer Tisch
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterZone(null)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
            !filterZone ? 'bg-[#3b1f0a] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >Alle</button>
        {zones.map(z => (
          <button
            key={z.value}
            onClick={() => setFilterZone(filterZone === z.value ? null : z.value)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              filterZone === z.value ? 'bg-[#3b1f0a] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{z.icon}</span>
            {z.label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
            className="w-4 h-4 rounded border-stone-300"
          />
          Inaktive zeigen
        </label>
      </div>

      {/* Add/Edit Form (modal-style inline) */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <h2 className="font-bold text-on-surface">{editingId ? 'Tisch bearbeiten' : 'Neuen Tisch anlegen'}</h2>
            <button onClick={() => { setShowForm(false); setEditingId(null) }} className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-stone-400">close</span>
            </button>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Nummer *</label>
                <input type="number" value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                  placeholder="1" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-mono" />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Fenster Links" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Zone *</label>
                <select value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm">
                  {zones.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Plätze *</label>
                <input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                  placeholder="2" min="1" max="20" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-mono" />
              </div>
            </div>

            {/* Amenities */}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={form.hasOutlet} onChange={e => setForm(f => ({ ...f, hasOutlet: e.target.checked }))}
                  className="w-4 h-4 rounded border-stone-300" />
                <span className="material-symbols-outlined text-base text-amber-600">power</span>
                Steckdose
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={form.hasNaturalLight} onChange={e => setForm(f => ({ ...f, hasNaturalLight: e.target.checked }))}
                  className="w-4 h-4 rounded border-stone-300" />
                <span className="material-symbols-outlined text-base text-sky-500">light_mode</span>
                Tageslicht
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowForm(false); setEditingId(null) }}
                className="px-5 py-2.5 bg-stone-100 text-stone-600 rounded-xl text-sm font-semibold active:scale-95 transition-all">
                Abbrechen
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2.5 bg-primary-container text-white rounded-xl text-sm font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">{saving ? 'progress_activity' : editingId ? 'save' : 'add'}</span>
                {editingId ? 'Speichern' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tables Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 skeleton rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-5xl text-stone-300 mb-3">table_restaurant</span>
          <p className="font-semibold text-on-surface">Keine Tische gefunden</p>
          <p className="text-sm text-on-surface-variant mt-1">Erstelle deinen ersten Tisch oben.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(table => {
            const zone = getZone(table.zone)
            const st = statusLabels[table.status] || statusLabels.EMPTY
            return (
              <div
                key={table.id}
                className={`group bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-md ${
                  !table.isActive ? 'opacity-50 border-stone-200 border-dashed' : 'border-stone-100'
                }`}
              >
                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#3b1f0a]/8 rounded-2xl flex items-center justify-center">
                        <span className="font-bold text-[#3b1f0a] text-lg">{table.number}</span>
                      </div>
                      <div>
                        <p className="font-bold text-on-surface text-sm">{table.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${zone.color}`}>
                            {zone.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${st.color}`}>
                            {st.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    {!table.isActive && (
                      <span className="px-2 py-0.5 bg-red-50 text-red-500 rounded-lg text-[10px] font-bold border border-red-100">
                        Inaktiv
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">group</span>
                      {table.capacity} Plätze
                    </span>
                    {table.hasOutlet && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <span className="material-symbols-outlined text-sm">power</span>
                        Steckdose
                      </span>
                    )}
                    {table.hasNaturalLight && (
                      <span className="flex items-center gap-1 text-sky-500">
                        <span className="material-symbols-outlined text-sm">light_mode</span>
                        Tageslicht
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="px-5 py-3 bg-stone-50/50 border-t border-stone-100 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(table)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-stone-100 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => toggleActive(table.id, table.isActive)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      table.isActive
                        ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">{table.isActive ? 'visibility_off' : 'visibility'}</span>
                    {table.isActive ? 'Deaktivieren' : 'Aktivieren'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
