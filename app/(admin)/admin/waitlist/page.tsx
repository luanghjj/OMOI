'use client'

import { useState, useEffect } from 'react'

interface WaitlistEntry {
  id: string
  name: string
  phone: string
  desiredDate: string
  desiredTime: string
  guestCount: number
  zone: string | null
  status: string
  createdAt: string
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  WAITING:  { bg: 'bg-amber-100 border border-amber-200',   text: 'text-amber-700',   label: 'Wartend' },
  NOTIFIED: { bg: 'bg-blue-100 border border-blue-200',     text: 'text-blue-700',    label: 'Benachrichtigt' },
  BOOKED:   { bg: 'bg-emerald-100 border border-emerald-200', text: 'text-emerald-700', label: 'Gebucht' },
  EXPIRED:  { bg: 'bg-stone-100 border border-stone-200',   text: 'text-stone-500',   label: 'Abgelaufen' },
}

export default function AdminWaitlistPage() {
  const [entries, setEntries]   = useState<WaitlistEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('ALL')

  useEffect(() => { fetchWaitlist() }, [])

  async function fetchWaitlist() {
    try {
      setLoading(true)
      const res  = await fetch('/api/waitlist')
      const data = await res.json()
      setEntries(data.entries || [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  async function updateStatus(id: string, status: string) {
    try {
      // optimistic update
      setEntries(prev => prev.map(e => e.id === id ? { ...e, status } : e))
      await fetch('/api/waitlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
    } catch { fetchWaitlist() }
  }

  const counts = {
    ALL:      entries.length,
    WAITING:  entries.filter(e => e.status === 'WAITING').length,
    NOTIFIED: entries.filter(e => e.status === 'NOTIFIED').length,
    BOOKED:   entries.filter(e => e.status === 'BOOKED').length,
  }

  const filtered = filter === 'ALL' ? entries : entries.filter(e => e.status === filter)

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Warteliste</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">{counts.WAITING} wartend · {counts.NOTIFIED} benachrichtigt · {counts.BOOKED} gebucht</p>
        </div>
        <button
          onClick={fetchWaitlist}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Aktualisieren
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'ALL',      label: 'Alle',             count: counts.ALL },
          { key: 'WAITING',  label: 'Wartend',           count: counts.WAITING },
          { key: 'NOTIFIED', label: 'Benachrichtigt',    count: counts.NOTIFIED },
          { key: 'BOOKED',   label: 'Gebucht',           count: counts.BOOKED },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
              filter === tab.key
                ? 'bg-primary-container text-white shadow-sm'
                : 'bg-white border border-stone-200 text-on-surface-variant hover:bg-stone-50'
            }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${filter === tab.key ? 'bg-white/20 text-white' : 'bg-stone-100 text-on-surface-variant'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 skeleton rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <span className="material-symbols-outlined text-4xl text-stone-300 mb-2">group_off</span>
            <p className="text-on-surface-variant text-sm">Keine Einträge {filter !== 'ALL' && `mit Status "${statusConfig[filter]?.label}"`}</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {filtered.map((entry) => {
              const cfg = statusConfig[entry.status] || statusConfig.EXPIRED
              const createdDate = new Date(entry.createdAt)
              const desiredDate = new Date(entry.desiredDate)
              const isToday = desiredDate.toDateString() === new Date().toDateString()

              return (
                <div key={entry.id} className="flex items-center gap-4 px-6 py-4 hover:bg-stone-50 transition-colors">
                  {/* Avatar */}
                  <div className="w-10 h-10 shrink-0 bg-[#3b1f0a]/8 rounded-full flex items-center justify-center">
                    <span className="text-[#3b1f0a] font-bold text-sm">{entry.name.charAt(0).toUpperCase()}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-on-surface text-sm">{entry.name}</p>
                      {isToday && (
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">Heute</span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {entry.phone}
                      {' · '}{entry.guestCount} Gäste
                      {' · '}{entry.desiredTime} Uhr · {desiredDate.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                    </p>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      Eingetragen: {createdDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr
                    </p>
                  </div>

                  {/* Status + actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                      {cfg.label}
                    </span>

                    {entry.status === 'WAITING' && (
                      <button
                        onClick={() => updateStatus(entry.id, 'NOTIFIED')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold active:scale-95 transition-all hover:bg-blue-700"
                      >
                        <span className="material-symbols-outlined text-sm">notifications</span>
                        Benachrichtigen
                      </button>
                    )}
                    {entry.status === 'NOTIFIED' && (
                      <button
                        onClick={() => updateStatus(entry.id, 'BOOKED')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold active:scale-95 transition-all hover:bg-emerald-700"
                      >
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Als gebucht markieren
                      </button>
                    )}
                    {(entry.status === 'WAITING' || entry.status === 'NOTIFIED') && (
                      <button
                        onClick={() => updateStatus(entry.id, 'EXPIRED')}
                        title="Ablaufen lassen"
                        className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
