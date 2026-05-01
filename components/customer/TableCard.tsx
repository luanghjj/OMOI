'use client'

import { useRouter } from 'next/navigation'

interface Table {
  id: string
  number: number
  name: string
  zone: string
  capacity: number
  hasOutlet: boolean
  hasNaturalLight: boolean
  photoUrl: string | null
  available: boolean
}

interface TableCardProps {
  table: Table | null
  onClose: () => void
}

const zoneLabels: Record<string, string> = {
  WINDOW: 'Fensterplatz',
  OUTDOOR: 'Außenbereich',
  QUIET: 'Ruhezone',
  WORKSPACE: 'Arbeitsplatz',
  BAR: 'Bar-Bereich',
}

const zoneTagColors: Record<string, string> = {
  WINDOW: 'bg-amber-50 text-amber-700 border-amber-100',
  OUTDOOR: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  QUIET: 'bg-violet-50 text-violet-700 border-violet-100',
  WORKSPACE: 'bg-blue-50 text-blue-700 border-blue-100',
  BAR: 'bg-pink-50 text-pink-700 border-pink-100',
}

// Placeholder images for each zone
const zonePlaceholders: Record<string, string> = {
  WINDOW: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=300&h=300&fit=crop',
  OUTDOOR: 'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=300&h=300&fit=crop',
  QUIET: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=300&h=300&fit=crop',
  WORKSPACE: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&h=300&fit=crop',
  BAR: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=300&h=300&fit=crop',
}

export default function TableCard({ table, onClose }: TableCardProps) {
  const router = useRouter()

  if (!table) return null

  const handleSelect = () => {
    router.push(`/booking/${table.id}`)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed bottom-20 left-0 right-0 z-50 px-4 md:px-6 md:max-w-lg md:mx-auto bottom-sheet-active">
        <div className="bg-surface-container-lowest rounded-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.12)] p-5 border border-stone-100">
          {/* Handle */}
          <div className="w-12 h-1 bg-stone-200 rounded-full mx-auto mb-4" />

          <div className="flex gap-4">
            {/* Table photo */}
            <div className="w-32 h-32 rounded-2xl overflow-hidden shrink-0 border border-stone-100 shadow-sm bg-surface-container">
              <img
                src={table.photoUrl || zonePlaceholders[table.zone] || zonePlaceholders.WINDOW}
                alt={`${table.name}`}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col justify-between py-1 flex-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-bold text-stone-900">
                    Tisch #{table.number} ({zoneLabels[table.zone]})
                  </h3>
                  <span
                    className="material-symbols-outlined text-amber-500"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                </div>

                <p className="text-stone-500 text-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">groups</span>
                  Max. {table.capacity} Personen
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`px-2 py-0.5 ${zoneTagColors[table.zone]} rounded-md text-[11px] font-semibold border`}>
                    {zoneLabels[table.zone]}
                  </span>
                  {table.hasOutlet && (
                    <span className="px-2 py-0.5 bg-stone-50 text-stone-600 rounded-md text-[11px] font-semibold border border-stone-100">
                      ⚡ Steckdose
                    </span>
                  )}
                  {table.hasNaturalLight && (
                    <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-md text-[11px] font-semibold border border-yellow-100">
                      ☀️ Tageslicht
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleSelect}
                className="w-full py-3 bg-primary-container text-white rounded-xl font-semibold text-sm active:scale-95 transition-all shadow-md shadow-primary-container/20 mt-3"
              >
                Diesen Tisch wählen
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
