'use client'

import { useState, useEffect } from 'react'

interface Table {
  id: string
  number: number
  name: string
  zone: string
  capacity: number
  hasOutlet: boolean
  hasNaturalLight: boolean
  photoUrl: string | null
  positionX: number
  positionY: number
  status: string
  available: boolean
}

interface FloorMapProps {
  tables: Table[]
  selectedTableId: string | null
  onTableSelect: (table: Table) => void
  filterZone: string | null
}

const zoneColors: Record<string, string> = {
  WINDOW: 'rgba(245, 166, 35, 0.06)',
  OUTDOOR: 'rgba(16, 185, 129, 0.06)',
  QUIET: 'rgba(139, 92, 246, 0.06)',
  WORKSPACE: 'rgba(59, 130, 246, 0.06)',
  BAR: 'rgba(236, 72, 153, 0.06)',
}

const zoneLabels: Record<string, string> = {
  WINDOW: 'Fensterplatz',
  OUTDOOR: 'Außenbereich',
  QUIET: 'Ruhezone',
  WORKSPACE: 'Arbeitsplatz',
  BAR: 'Bar-Bereich',
}

// Zone boundaries for background rectangles
const zoneBounds: Record<string, { x: number; y: number; w: number; h: number }> = {
  WINDOW: { x: 65, y: 2, w: 32, h: 52 },
  OUTDOOR: { x: 3, y: 5, w: 28, h: 45 },
  QUIET: { x: 32, y: 8, w: 32, h: 25 },
  WORKSPACE: { x: 32, y: 42, w: 32, h: 25 },
  BAR: { x: 30, y: 72, w: 40, h: 20 },
}

function getTableColor(table: Table, isSelected: boolean): string {
  if (isSelected) return '#f5a623' // brand-amber for selected
  if (!table.available) return '#f43f5e' // rose-500 for booked
  if (table.status === 'CLEANING') return '#a78bfa' // purple for cleaning
  if (table.status === 'SEATED') return '#ef4444' // red for in-service
  return '#10b981' // emerald-500 for available
}

function getTableShape(table: Table): { type: 'circle' | 'rect'; w: number; h: number } {
  // Bar table is long rectangle
  if (table.zone === 'BAR') return { type: 'rect', w: 18, h: 5 }
  // WORKSPACE tables are smaller circles
  if (table.zone === 'WORKSPACE') return { type: 'circle', w: 5, h: 5 }
  // Groups of 4 are slightly larger
  if (table.capacity >= 4) return { type: 'rect', w: 8, h: 6 }
  // Default 2-person circle
  return { type: 'circle', w: 6, h: 6 }
}

export default function FloorMap({ tables, selectedTableId, onTableSelect, filterZone }: FloorMapProps) {
  const filteredTables = filterZone
    ? tables.filter((t) => t.zone === filterZone)
    : tables

  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 100 95"
        className="w-full h-auto"
        style={{ maxHeight: '60vh' }}
      >
        {/* Background */}
        <rect width="100" height="95" fill="#faf7f2" rx="4" />

        {/* Dot grid pattern */}
        <defs>
          <pattern id="dotGrid" width="4" height="4" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.3" fill="#d4c3ba" opacity="0.5" />
          </pattern>
        </defs>
        <rect width="100" height="95" fill="url(#dotGrid)" rx="4" />

        {/* Zone backgrounds */}
        {Object.entries(zoneBounds).map(([zone, bounds]) => (
          <g key={zone}>
            <rect
              x={bounds.x}
              y={bounds.y}
              width={bounds.w}
              height={bounds.h}
              fill={zoneColors[zone]}
              rx="3"
              stroke={filterZone === zone ? '#f5a623' : 'transparent'}
              strokeWidth="0.5"
              strokeDasharray="2 1"
            />
            <text
              x={bounds.x + bounds.w / 2}
              y={bounds.y + 3}
              textAnchor="middle"
              fill="#82746c"
              fontSize="2"
              fontWeight="600"
              opacity="0.6"
            >
              {zoneLabels[zone]}
            </text>
          </g>
        ))}

        {/* Entrance */}
        <rect x="42" y="91" width="16" height="1.5" fill="#a8a29e" rx="0.75" />
        <text x="50" y="90" textAnchor="middle" fill="#a8a29e" fontSize="1.8" fontWeight="600" letterSpacing="0.15">
          EINGANG
        </text>

        {/* Window decoration */}
        <rect x="68" y="0" width="28" height="0.8" fill="#fcd34d" opacity="0.3" rx="0.4" />
        <text x="82" y="4" textAnchor="middle" fill="#f59e0b" fontSize="1.6" opacity="0.4" fontWeight="500">
          Großes Fenster
        </text>

        {/* Tables */}
        {filteredTables.map((table) => {
          const shape = getTableShape(table)
          const isSelected = selectedTableId === table.id
          const color = getTableColor(table, isSelected)
          const dimmed = filterZone && table.zone !== filterZone

          return (
            <g
              key={table.id}
              onClick={() => table.available && onTableSelect(table)}
              className={`table-transition ${table.available ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              opacity={dimmed ? 0.3 : 1}
            >
              {shape.type === 'circle' ? (
                <circle
                  cx={table.positionX}
                  cy={table.positionY}
                  r={shape.w / 2}
                  fill={color}
                  stroke={isSelected ? '#f5a623' : 'white'}
                  strokeWidth={isSelected ? 1 : 0.5}
                />
              ) : (
                <rect
                  x={table.positionX - shape.w / 2}
                  y={table.positionY - shape.h / 2}
                  width={shape.w}
                  height={shape.h}
                  fill={color}
                  rx="2"
                  stroke={isSelected ? '#f5a623' : 'white'}
                  strokeWidth={isSelected ? 1 : 0.5}
                />
              )}

              {/* Table number */}
              <text
                x={table.positionX}
                y={table.positionY + 0.8}
                textAnchor="middle"
                fill="white"
                fontSize="2.5"
                fontWeight="700"
              >
                {String(table.number).padStart(2, '0')}
              </text>

              {/* Selection indicator dot */}
              {isSelected && (
                <circle
                  cx={table.positionX + (shape.type === 'circle' ? shape.w / 2 - 0.5 : shape.w / 2 - 0.5)}
                  cy={table.positionY - (shape.type === 'circle' ? shape.w / 2 - 0.5 : shape.h / 2 - 0.5)}
                  r="1.2"
                  fill="#f5a623"
                  stroke="white"
                  strokeWidth="0.5"
                />
              )}
            </g>
          )
        })}

        {/* Bar counter */}
        <path
          d="M 72 78 L 72 88 L 82 88"
          fill="none"
          stroke="#d4c3ba"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
        <text x="78" y="84" textAnchor="middle" fill="#a8a29e" fontSize="1.5" fontWeight="600" letterSpacing="0.1">
          BAR-THEKE
        </text>
      </svg>
    </div>
  )
}
