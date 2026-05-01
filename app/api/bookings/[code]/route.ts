import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/bookings/[code]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        table:tables(*),
        assignedTables:booking_tables(*, table:tables(*)),
        preOrders:pre_orders(*, menuItem:menu_items(*))
      `)
      .eq('bookingCode', code)
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }
    return NextResponse.json({ booking })
  } catch (error) {
    console.error('GET /api/bookings/[code] error:', error)
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 })
  }
}

// PATCH /api/bookings/[code]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const body = await request.json()
    const { status, tableId, guestName, guestPhone, guestEmail, guestCount, date, startTime, endTime, specialNote } = body

    const updateData: Record<string, unknown> = {}

    if (status !== undefined) {
      const validStatuses = ['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 })
      }
      updateData.status = status
    }

    // Editable guest fields
    if (guestName !== undefined) updateData.guestName = guestName
    if (guestPhone !== undefined) updateData.guestPhone = guestPhone
    if (guestEmail !== undefined) updateData.guestEmail = guestEmail || null
    if (guestCount !== undefined) updateData.guestCount = parseInt(String(guestCount))
    if (date !== undefined) updateData.date = date
    if (startTime !== undefined) updateData.startTime = startTime
    if (endTime !== undefined) updateData.endTime = endTime
    if (specialNote !== undefined) updateData.specialNote = specialNote || null

    if (tableId !== undefined) {
      const nextTableId = tableId || null

      const { data: existingBooking } = await supabase
        .from('bookings').select('*').eq('bookingCode', code).single()

      if (!existingBooking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }

      if (nextTableId) {
        const { data: table } = await supabase.from('tables').select('*').eq('id', nextTableId).single()
        if (!table) return NextResponse.json({ error: 'Table not found' }, { status: 404 })

        if (table.capacity < existingBooking.guestCount) {
          return NextResponse.json(
            { error: `Table capacity is ${table.capacity}, but ${existingBooking.guestCount} guests requested` },
            { status: 400 }
          )
        }

        const { data: conflicts } = await supabase
          .from('bookings')
          .select('id')
          .neq('id', existingBooking.id)
          .eq('date', existingBooking.date)
          .in('status', ['PENDING', 'CONFIRMED', 'SEATED'])
          .eq('tableId', nextTableId)
          .lt('startTime', existingBooking.endTime)
          .gt('endTime', existingBooking.startTime)

        if (conflicts && conflicts.length > 0) {
          return NextResponse.json({ error: 'This table is already booked for the selected time slot' }, { status: 409 })
        }
      }

      updateData.tableId = nextTableId
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { data: booking, error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('bookingCode', code)
      .select(`*, table:tables(*), assignedTables:booking_tables(*, table:tables(*))`)
      .single()

    if (updateError || !booking) throw updateError

    // Update booking_tables if tableId changed
    if (tableId !== undefined) {
      await supabase.from('booking_tables').delete().eq('bookingId', booking.id)
      if (booking.tableId) {
        await supabase.from('booking_tables').insert({ bookingId: booking.id, tableId: booking.tableId })
      }
      const { data: refreshed } = await supabase
        .from('bookings')
        .select(`*, table:tables(*), assignedTables:booking_tables(*, table:tables(*))`)
        .eq('bookingCode', code)
        .single()
      if (refreshed) return NextResponse.json({ success: true, booking: refreshed })
    }

    return NextResponse.json({ success: true, booking })
  } catch (error) {
    console.error('PATCH /api/bookings/[code] error:', error)
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }
}
