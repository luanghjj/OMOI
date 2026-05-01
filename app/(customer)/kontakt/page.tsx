import Link from 'next/link'

export const metadata = { title: 'Kontakt – OMOI Café' }

const HOURS = [
  { day: 'Dienstag',   time: '10 — 20 Uhr' },
  { day: 'Mittwoch',   time: '10 — 20 Uhr' },
  { day: 'Donnerstag', time: '10 — 20 Uhr' },
  { day: 'Freitag',    time: '10 — 22 Uhr' },
  { day: 'Samstag',    time: '11 — 22 Uhr' },
  { day: 'Sonntag',    time: '11 — 19 Uhr' },
]

export default function KontaktPage() {
  return (
    <div className="min-h-screen bg-[#fdfbf7]">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-600 flex items-center gap-1 mb-10">
          ← Zurück
        </Link>

        <h1 className="text-3xl font-bold text-[#3b1f0a] mb-8">Kontakt</h1>

        {/* Opening hours */}
        <div className="bg-white border border-[#e8dcc8] rounded-2xl p-6 mb-5">
          <p className="text-xs font-bold text-[#C4975C] uppercase tracking-widest mb-5">Öffnungszeiten</p>
          <div className="space-y-3">
            {HOURS.map(({ day, time }) => (
              <div key={day} className="flex justify-between items-center border-b border-stone-100 pb-2 last:border-0 last:pb-0">
                <span className="text-sm text-stone-500 w-32">{day}</span>
                <span className="text-sm font-semibold text-[#3b1f0a]">{time}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-stone-100 space-y-1 text-center">
            <p className="text-xs font-bold tracking-widest text-stone-400 uppercase">Montag · Ruhetag</p>
            <p className="text-xs text-stone-400 italic">An Feiertagen wie sonntags · 11 — 19 Uhr</p>
            <p className="text-xs text-stone-400 mt-2">gültig ab Freitag · 1. Mai</p>
          </div>
        </div>

        {/* Other info */}
        <div className="space-y-4">
          {[
            { icon: '📍', label: 'Adresse', value: 'Hauptstätter Str. 57\n70178 Stuttgart-Mitte' },
            { icon: '✉️', label: 'E-Mail', value: 'hello@o-mo-i.de' },
            { icon: '🌐', label: 'Website', value: 'o-mo-i.de' },
            { icon: '📱', label: 'Instagram', value: '@omoi.stuttgart' },
            { icon: '🛜', label: 'WLAN', value: 'OMOI guest · Passwort: omoi2026' },
          ].map(item => (
            <div key={item.label} className="flex gap-4 p-4 bg-white rounded-2xl border border-[#e8dcc8]">
              <span className="text-xl">{item.icon}</span>
              <div>
                <p className="text-xs font-bold text-[#C4975C] uppercase tracking-widest mb-1">{item.label}</p>
                <p className="text-stone-600 text-sm whitespace-pre-line">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-5 bg-[#faf6f0] border border-[#e8dcc8] rounded-2xl text-sm text-stone-500">
          Für Tischreservierungen nutze bitte unser{' '}
          <Link href="/booking" className="text-[#C4975C] font-semibold hover:underline">
            Online-Reservierungsformular
          </Link>
          . Bitte sprich uns bei Allergien oder Unverträglichkeiten an.
        </div>
      </div>
    </div>
  )
}
