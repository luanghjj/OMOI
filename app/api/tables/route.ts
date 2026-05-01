import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getMockTablesWithAvailability } from '@/lib/mock-data'
import { getSettings } from '@/lib/settings'
import { generateId } from '@/lib/id'
import { requireStaff } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const guard = await requireStaff(); if (guard instanceof Response) return guard
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')
    const timeStr = searchParams.get('time')
    const guestCountStr = searchParams.get('guestCount')
    const zone = searchParams.get('zone')
    const includeAll = searchParams.get('all') === 'true'

    let query = supabase.from('tables').select('*').order('number', { ascending: true })
    if (!includeAll) query = query.eq('isActive', true)
    if (zone) query = query.eq('zone', zone)
    if (guestCountStr) query = query.gte('capacity', parseInt(guestCountStr))

    const { data: tables, error } = await query
    if (error) throw error

    if (dateStr && timeStr) {
      const settings = await getSettings()
      const [h, m] = timeStr.split(':').map(Number)
      const endMinutes = h * 60 + m + settings.bookingDuration
      const endTime = `${String(Math.floor(endMinutes / 60) % 24).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`

      const { data: conflictingBookings } = await supabase
        .from('bookings')
        .select('tableId, assignedTables:booking_tables(tableId)')
        .eq('date', dateStr)
        .in('status', ['PENDING', 'CONFIRMED', 'SEATED'])
        .lt('startTime', endTime)
        .gt('endTime', timeStr)

      const bookedTableIds = new Set<string>()
      ;(conflictingBookings || []).forEach((b: { tableId: string | null; assignedTables: { tableId: string }[] }) => {
        if (b.tableId) bookedTableIds.add(b.tableId)
        b.assignedTables?.forEach((a) => bookedTableIds.add(a.tableId))
      })

      return NextResponse.json({
        tables: (tables || []).map((t) => ({ ...t, available: !bookedTableIds.has(t.id) })),
      })
    }

    return NextResponse.json({
      tables: (tables || []).map((t) => ({ ...t, available: t.status === 'EMPTY' })),
    })
  } catch (error) {
    console.error('GET /api/tables error:', error)
    return NextResponse.json({ tables: getMockTablesWithAvailability(), _mock: true })
  }
}

// POST /api/tables — create a new table
export async function POST(request: NextRequest) {
  const guard = await requireStaff('MANAGER'); if (guard instanceof Response) return guard
  try {
    const body = await request.json()
    const { number, name, zone, capacity, hasOutlet, hasNaturalLight, positionX, positionY } = body

    if (!number || !name || !zone || !capacity) {
      return NextResponse.json({ error: 'Missing required fields: number, name, zone, capacity' }, { status: 400 })
    }

    const { data: existing } = await supabase.from('tables').select('id').eq('number', number).single()
    if (existing) {
      return NextResponse.json({ error: `Tisch ${number} existiert bereits` }, { status: 409 })
    }

    const { data: table, error } = await supabase.from('tables').insert({
      id: generateId(),
      number,
      name,
      zone,
      capacity,
      hasOutlet: hasOutlet || false,
      hasNaturalLight: hasNaturalLight || false,
      positionX: positionX ?? 50,
      positionY: positionY ?? 50,
      isActive: true,
      status: 'EMPTY',
    }).select().single()

    if (error) throw error
    return NextResponse.json({ success: true, table })
  } catch (error) {
    console.error('POST /api/tables error:', error)
    return NextResponse.json({ error: 'Failed to create table' }, { status: 500 })
  }
}
