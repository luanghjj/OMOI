'use client'

import { ReactNode, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from '@/components/shared/Sidebar'

type StaffRole = 'OWNER' | 'MANAGER' | 'STAFF' | 'ADMIN'
interface Session { id: string; name: string; email: string; role: StaffRole }

function roleLevel(role: StaffRole): number {
  return { STAFF: 1, MANAGER: 3, ADMIN: 4, OWNER: 4 }[role] ?? 0
}

const mobileNavItems = [
  { href: '/admin',          icon: 'dashboard',         label: 'Home',       minLevel: 1 },
  { href: '/admin/bookings', icon: 'calendar_month',    label: 'Termine',    minLevel: 1 },
  { href: '/admin/waitlist', icon: 'group',             label: 'Warteliste', minLevel: 1 },
  { href: '/admin/floor',    icon: 'layers',            label: 'Tischplan',  minLevel: 1 },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
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

  const level = session ? roleLevel(session.role) : 0
  const visibleMobileNav = mobileNavItems.filter(i => level >= i.minLevel)

  return (
    <div className="min-h-screen bg-background text-on-background antialiased">
      <Sidebar />

      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen bg-mesh-gradient pb-24 lg:pb-0">
        {/* Top App Bar */}
        <header className="sticky top-0 z-40 flex justify-between items-center px-4 sm:px-6 h-16 w-full bg-[#fdfbf7] text-[#3b1f0a] text-sm font-medium border-b border-stone-200 shadow-sm shadow-[#3b1f0a]/5">
          <div className="flex items-center gap-4 lg:gap-6 min-w-0">
            <div className="flex items-center gap-3">
              <img src="/images/omoi-logo.png" alt="OMOI" className="h-5 object-contain" />
              <span className="px-2 py-0.5 bg-primary-container text-white text-[10px] font-bold rounded-md uppercase tracking-wider">Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {session && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#f0e8d8] flex items-center justify-center text-[#8B6914] font-black text-xs">
                  {session.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block text-sm font-medium text-[#3b1f0a]">{session.name}</span>
              </div>
            )}
            <button onClick={handleLogout} title="Abmelden"
              className="p-2 hover:bg-red-50 rounded-full text-stone-400 hover:text-red-500 transition-colors">
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </header>

        {children}
      </div>


      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#fdfbf7]/95 backdrop-blur border-t border-stone-200 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-4 gap-1 max-w-xl mx-auto items-end">
          {visibleMobileNav.map((item) => {
            const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`min-h-14 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                  isActive
                    ? 'bg-primary-container text-white'
                    : 'text-stone-500 hover:bg-[#f5f0e6] hover:text-[#3b1f0a]'
                }`}
              >
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
