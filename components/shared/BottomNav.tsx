'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', icon: 'home', label: 'Startseite' },
  { href: '/booking', icon: 'event_seat', label: 'Reservieren' },
  { href: '/account', icon: 'history', label: 'Verlauf' },
  { href: '/account', icon: 'person', label: 'Konto' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 w-full z-50 rounded-t-3xl border-t border-stone-200 bg-stone-50 shadow-[0_-4px_20px_rgba(59,31,10,0.08)] md:hidden">
      <div className="flex justify-around items-center pt-3 pb-6 px-2 w-full">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname?.startsWith(item.href)
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center px-5 py-1.5 active:scale-90 transition-all duration-300 ease-out ${
                isActive
                  ? 'bg-amber-500 text-stone-900 rounded-2xl'
                  : 'text-stone-400 hover:text-amber-700'
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              <span className="text-[11px] font-medium mt-1">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
