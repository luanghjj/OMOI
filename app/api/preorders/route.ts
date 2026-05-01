import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireStaff } from '@/lib/auth'
import { generateId } from '@/lib/id'

// GET /api/preorders?bookingId= — get pre-orders for a booking
export async function GET(request: NextRequest) {
  const guard = await requireStaff(); if (guard instanceof Response) return guard
  try {
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
    }

    const { data: preOrders, error } = await supabase
      .from('pre_orders')
      .select('*, menuItem:menu_items(*)')
      .eq('bookingId', bookingId)

    if (error) throw error

    const total = (preOrders || []).reduce(
      (sum, po) => sum + (po.menuItem?.price || 0) * po.quantity,
      0
    )

    return NextResponse.json({ preOrders: preOrders || [], total })
  } catch (error) {
    console.error('GET /api/preorders error:', error)
    return NextResponse.json({ error: 'Failed to fetch pre-orders' }, { status: 500 })
  }
}

// POST /api/preorders — add pre-orders to a booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId, items } = body

    if (!bookingId || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'bookingId and items array are required' }, { status: 400 })
    }

    // Verify booking exists
    const { data: booking } = await supabase
      .from('bookings')
      .select('id')
      .eq('id', bookingId)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Clear existing pre-orders
    await supabase.from('pre_orders').delete().eq('bookingId', bookingId)

    // Create new ones
    const rows = items.map((item: { menuItemId: string; quantity: number; note?: string }) => ({
      id: generateId(),
      bookingId,
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      note: item.note || null,
    }))

    const { error } = await supabase.from('pre_orders').insert(rows)
    if (error) throw error

    return NextResponse.json({ success: true, count: rows.length })
  } catch (error) {
    console.error('POST /api/preorders error:', error)
    return NextResponse.json({ error: 'Failed to create pre-orders' }, { status: 500 })
  }
}
