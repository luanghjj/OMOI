'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import BottomNav from '@/components/shared/BottomNav'

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const isConfirmPage = pathname?.startsWith('/booking/confirm')

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Top AppBar */}
      {!isConfirmPage && (
        <header className="fixed top-0 w-full z-50 bg-stone-50/80 backdrop-blur-md border-b border-stone-200 shadow-sm">
          <div className="flex items-center justify-between px-4 h-16 w-full max-w-7xl mx-auto">
            {isHome ? (
              <button className="material-symbols-outlined text-stone-900 hover:bg-stone-100 transition-colors p-2 rounded-full active:scale-95 duration-200">
                menu
              </button>
            ) : (
              <Link
                href="/"
                className="material-symbols-outlined text-stone-900 hover:bg-stone-100 transition-colors p-2 rounded-full active:scale-95 duration-200"
              >
                arrow_back
              </Link>
            )}
            <Link href="/" className="flex items-center gap-2">
              <img src="/images/omoi-avatar.png" alt="OMOI" className="w-8 h-8 rounded-full" />
              {isHome && (
                <img src="/images/omoi-logo.png" alt="OMOI" className="h-6 object-contain" />
              )}
              {!isHome && pathname?.includes('/booking') && (
                <span className="text-sm font-bold text-stone-900 uppercase tracking-widest">RESERVIERUNG</span>
              )}
              {!isHome && pathname?.includes('/account') && (
                <span className="text-sm font-bold text-stone-900 uppercase tracking-widest">VERLAUF</span>
              )}
            </Link>
            <div className="w-10 h-10 rounded-full overflow-hidden border border-stone-200 bg-surface-container">
              <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined">person</span>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={isConfirmPage ? '' : 'pt-16 pb-24'}>
        {children}
      </main>

      {/* Bottom Navigation */}
      {!isConfirmPage && <BottomNav />}
    </div>
  )
}
