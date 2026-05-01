'use client'

import { useState, useEffect } from 'react'

type StaffRole = 'OWNER' | 'MANAGER' | 'STAFF' | 'ADMIN'
interface StaffMember { id: string; name: string; email: string; role: StaffRole }

// DB enum: ADMIN, STAFF, MANAGER
const ROLE_LABELS: Record<StaffRole, string> = {
  OWNER: 'Inhaber', MANAGER: 'Manager', STAFF: 'Mitarbeiter', ADMIN: 'Inhaber',
}
const ROLE_COLORS: Record<StaffRole, string> = {
  OWNER: 'bg-purple-100 text-purple-800 border-purple-200',
  MANAGER: 'bg-blue-100 text-blue-800 border-blue-200',
  STAFF: 'bg-stone-100 text-stone-700 border-stone-200',
  ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
}
const ROLE_ICONS: Record<StaffRole, string> = {
  OWNER: 'stars', MANAGER: 'manage_accounts', STAFF: 'badge', ADMIN: 'stars',
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editMember, setEditMember] = useState<StaffMember | null>(null)
  const [showResetPw, setShowResetPw] = useState<StaffMember | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => { fetchStaff() }, [])

  async function fetchStaff() {
    setLoading(true)
    const res = await fetch('/api/staff', { credentials: 'include' })
    const d = await res.json()
    setStaff(d.staff || [])
    setLoading(false)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/staff', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fd.get('name'), email: fd.get('email'),
        password: fd.get('password'), role: fd.get('role'),
      }),
    })
    if (res.ok) { showToast('Mitarbeiter erstellt ✓'); setShowCreate(false); fetchStaff() }
    else { const d = await res.json(); showToast('Fehler: ' + d.error) }
  }

  async function handleRoleChange(id: string, role: StaffRole) {
    const res = await fetch('/api/staff/' + id, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (res.ok) { showToast('Rolle geändert ✓'); fetchStaff(); setEditMember(null) }
    else { const d = await res.json(); showToast('Fehler: ' + d.error) }
  }

  async function handleResetPw(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/staff/' + showResetPw!.id, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: fd.get('password') }),
    })
    if (res.ok) { showToast('Passwort zurückgesetzt ✓'); setShowResetPw(null) }
  }

  async function handleDelete(member: StaffMember) {
    if (!confirm(`${member.name} wirklich löschen?`)) return
    const res = await fetch('/api/staff/' + member.id, { method: 'DELETE', credentials: 'include' })
    if (res.ok) { showToast('Mitarbeiter gelöscht'); fetchStaff() }
  }

  const byRole = ['OWNER', 'MANAGER', 'ADMIN', 'STAFF'] as StaffRole[]

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[#3b1f0a] text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#3b1f0a]">Team-Verwaltung</h1>
          <p className="text-sm text-stone-500 mt-0.5">Mitarbeiterzugänge und Berechtigungen</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-[#3b1f0a] text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#5a3018] active:scale-95 transition-all">
          <span className="material-symbols-outlined text-lg">person_add</span>
          Hinzufügen
        </button>
      </div>

      {/* Staff List grouped by role */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-stone-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {byRole.map(role => {
            const members = staff.filter(s => s.role === role)
            if (!members.length) return null
            return (
              <div key={role}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-[#8B6914] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>{ROLE_ICONS[role]}</span>
                  <h2 className="text-xs font-bold text-[#a89070] uppercase tracking-widest">{ROLE_LABELS[role]}</h2>
                  <span className="text-xs text-stone-400">({members.length})</span>
                </div>
                <div className="space-y-2">
                  {members.map(member => (
                    <div key={member.id} className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-stone-100">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-[#f0e8d8] flex items-center justify-center text-[#8B6914] font-black text-sm shrink-0">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#3b1f0a] text-sm">{member.name}</p>
                        <p className="text-xs text-stone-400 truncate">{member.email}</p>
                      </div>
                      {/* Role badge */}
                      <span className={'text-[10px] font-bold px-2.5 py-1 rounded-full border ' + ROLE_COLORS[role]}>
                        {ROLE_LABELS[role]}
                      </span>
                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditMember(member)}
                          className="p-2 hover:bg-[#f5f0e6] rounded-lg text-[#8B6914] transition-colors" title="Rolle ändern">
                          <span className="material-symbols-outlined text-base">manage_accounts</span>
                        </button>
                        <button onClick={() => setShowResetPw(member)}
                          className="p-2 hover:bg-[#f5f0e6] rounded-lg text-[#8B6914] transition-colors" title="Passwort zurücksetzen">
                          <span className="material-symbols-outlined text-base">key</span>
                        </button>
                        <button onClick={() => handleDelete(member)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-400 transition-colors" title="Löschen">
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create Modal ─────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-black text-[#3b1f0a] mb-5">Neuen Mitarbeiter hinzufügen</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              {[
                { name: 'name', label: 'Name', type: 'text', placeholder: 'Max Mustermann' },
                { name: 'email', label: 'E-Mail', type: 'email', placeholder: 'max@omoi.cafe' },
                { name: 'password', label: 'Passwort', type: 'password', placeholder: 'Sicheres Passwort' },
              ].map(f => (
                <div key={f.name}>
                  <label className="text-[10px] font-bold text-[#a89070] uppercase tracking-widest block mb-1">{f.label}</label>
                  <input name={f.name} type={f.type} required placeholder={f.placeholder}
                    className="w-full px-4 py-2.5 bg-[#faf6f0] border border-[#e8dcc8] rounded-xl text-sm text-[#3b1f0a] focus:outline-none focus:ring-2 focus:ring-[#C4975C]/30" />
                </div>
              ))}
              <div>
                <label className="text-[10px] font-bold text-[#a89070] uppercase tracking-widest block mb-1">Rolle</label>
                <select name="role" required
                  className="w-full px-4 py-2.5 bg-[#faf6f0] border border-[#e8dcc8] rounded-xl text-sm text-[#3b1f0a] focus:outline-none focus:ring-2 focus:ring-[#C4975C]/30">
                  <option value="STAFF">Mitarbeiter</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Inhaber / Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 border border-stone-200 rounded-xl text-sm font-semibold text-stone-600">
                  Abbrechen
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-[#3b1f0a] text-white rounded-xl text-sm font-bold">
                  Erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Role Modal ────────────────────────────────────── */}
      {editMember && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => setEditMember(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-black text-[#3b1f0a] mb-1">Rolle ändern</h2>
            <p className="text-sm text-stone-500 mb-5">{editMember.name}</p>
            <div className="space-y-2">
              {(['ADMIN', 'MANAGER', 'STAFF'] as StaffRole[]).map(role => (
                <button key={role} onClick={() => handleRoleChange(editMember.id, role)}
                  className={'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all '
                    + (editMember.role === role ? 'border-[#C4975C] bg-[#faf6f0]' : 'border-stone-100 hover:border-stone-200')}>
                  <span className="material-symbols-outlined text-[#8B6914]" style={{ fontVariationSettings: "'FILL' 1" }}>{ROLE_ICONS[role]}</span>
                  <div className="text-left">
                    <p className="font-bold text-[#3b1f0a] text-sm">{ROLE_LABELS[role]}</p>
                    <p className="text-xs text-stone-400">
                      {role === 'ADMIN' ? 'Vollzugriff (Einstellungen, Team)' : role === 'MANAGER' ? 'Reservierungen, Tischplan' : 'Basis-Zugang'}
                    </p>
                  </div>
                  {editMember.role === role && <span className="ml-auto material-symbols-outlined text-[#C4975C]">check_circle</span>}
                </button>
              ))}
            </div>
            <button onClick={() => setEditMember(null)}
              className="w-full mt-4 py-2.5 border border-stone-200 rounded-xl text-sm font-semibold text-stone-600">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ──────────────────────────────── */}
      {showResetPw && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => setShowResetPw(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-black text-[#3b1f0a] mb-1">Passwort zurücksetzen</h2>
            <p className="text-sm text-stone-500 mb-5">{showResetPw.name}</p>
            <form onSubmit={handleResetPw} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[#a89070] uppercase tracking-widest block mb-1">Neues Passwort</label>
                <input name="password" type="password" required minLength={6} placeholder="Mindestens 6 Zeichen"
                  className="w-full px-4 py-2.5 bg-[#faf6f0] border border-[#e8dcc8] rounded-xl text-sm text-[#3b1f0a] focus:outline-none focus:ring-2 focus:ring-[#C4975C]/30" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowResetPw(null)}
                  className="flex-1 py-2.5 border border-stone-200 rounded-xl text-sm font-semibold text-stone-600">
                  Abbrechen
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-[#3b1f0a] text-white rounded-xl text-sm font-bold">
                  Zurücksetzen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
