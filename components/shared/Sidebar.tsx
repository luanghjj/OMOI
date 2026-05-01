'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type StaffRole = 'OWNER' | 'MANAGER' | 'STAFF' | 'ADMIN'
interface Session { id: string; name: string; email: string; role: StaffRole }

const ROLE_LABELS: Record<StaffRole, string> = {
  OWNER: 'Inhaber', MANAGER: 'Manager', STAFF: 'Mitarbeiter', ADMIN: 'Inhaber',
}
const ROLE_COLORS: Record<StaffRole, string> = {
  OWNER: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-purple-100 text-purple-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  STAFF: 'bg-stone-100 text-stone-600',
}

// Role level helper
function roleLevel(role: StaffRole): number {
  return { STAFF: 1, MANAGER: 3, ADMIN: 4, OWNER: 4 }[role] ?? 0
}

const allNavItems = [
  { href: '/admin',           icon: 'dashboard',        label: 'Übersicht',       minLevel: 1 },
  { href: '/admin/bookings',  icon: 'event_available',  label: 'Reservierungen',  minLevel: 1 },
  { href: '/admin/waitlist',  icon: 'group',            label: 'Warteliste',      minLevel: 1 },
  { href: '/admin/floor',     icon: 'layers',           label: 'Tischplan',       minLevel: 1 },
  { href: '/admin/tables',    icon: 'table_restaurant', label: 'Tischverwaltung', minLevel: 3 },
  { href: '/admin/settings',  icon: 'tune',             label: 'Einstellungen',   minLevel: 4 },
  { href: '/admin/staff',     icon: 'manage_accounts',  label: 'Team-Verwaltung', minLevel: 4 },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.session) setSession(d.session) })
      .catch(() => {})
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  const level = session ? roleLevel(session.role) : 99  // show all while loading
  const navItems = allNavItems.filter(item => level >= item.minLevel)

  return (
    <aside className="fixed left-0 top-0 h-full hidden lg:flex flex-col py-4 bg-[#fdfbf7] text-[#3b1f0a] text-sm antialiased w-64 border-r border-stone-200 z-50">
      {/* Logo */}
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-stone-200 flex items-center justify-center p-1">
          <img src="/images/omoi-avatar.png" alt="OMOI" className="w-full h-full object-contain" />
        </div>
        <div>
          <img src="/images/omoi-logo.png" alt="OMOI" className="h-5 object-contain" />
          <p className="text-xs opacity-60 mt-0.5">Cafe & Roastery</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium group ${
                isActive
                  ? 'bg-primary-container text-white shadow-sm'
                  : 'hover:bg-[#f5f0e6] text-stone-600 hover:text-[#3b1f0a]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User info + Logout */}
      <div className="px-4 mt-4 pt-4 border-t border-stone-200">
        {session ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#f0e8d8] flex items-center justify-center text-[#8B6914] font-black text-sm shrink-0">
              {session.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#3b1f0a] truncate">{session.name}</p>
              <span className={'text-[10px] font-bold px-1.5 py-0.5 rounded-md ' + ROLE_COLORS[session.role]}>
                {ROLE_LABELS[session.role]}
              </span>
            </div>
            <button onClick={handleLogout} title="Abmelden"
              className="p-1.5 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-500 transition-colors">
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        ) : (
          <div className="h-12 bg-stone-100 rounded-xl animate-pulse" />
        )}
      </div>
    </aside>
  )
}
