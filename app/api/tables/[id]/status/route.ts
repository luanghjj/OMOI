import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// PATCH /api/tables/[id]/status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    const validStatuses = ['EMPTY', 'BOOKED', 'SEATED', 'CLEANING']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const { data: table, error } = await supabase
      .from('tables')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, table })
  } catch (error) {
    console.error('PATCH /api/tables/[id]/status error:', error)
    return NextResponse.json({ error: 'Failed to update table status' }, { status: 500 })
  }
}

// GET /api/tables/[id]/status
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const today = new Date().toISOString().split('T')[0]

    const { data: table, error } = await supabase
      .from('tables')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('tableId', id)
      .eq('date', today)
      .in('status', ['CONFIRMED', 'SEATED'])
      .order('startTime', { ascending: true })

    return NextResponse.json({ table: { ...table, bookings: bookings || [] } })
  } catch (error) {
    console.error('GET /api/tables/[id]/status error:', error)
    return NextResponse.json({ error: 'Failed to fetch table status' }, { status: 500 })
  }
}
