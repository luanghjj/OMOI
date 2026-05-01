import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateId } from '@/lib/id'
import { requireStaff } from '@/lib/auth'

// GET — admin only (view waitlist)
export async function GET(request: NextRequest) {
  const guard = await requireStaff(); if (guard instanceof Response) return guard
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase.from('waitlist').select('*').order('createdAt', { ascending: false })
    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ entries: data || [] })
  } catch (error) {
    console.error('GET /api/waitlist error:', error)
    return NextResponse.json({ entries: [] })
  }
}

// POST — public (customer joins waitlist)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, desiredDate, desiredTime, guestCount, zone } = body

    if (!name || !phone || !desiredDate || !desiredTime || !guestCount) {
      return NextResponse.json(
        { error: 'Missing required fields: name, phone, desiredDate, desiredTime, guestCount' },
        { status: 400 }
      )
    }

    const { data: entry, error } = await supabase.from('waitlist').insert({
      id: generateId(),
      name, phone, desiredDate, desiredTime,
      guestCount: parseInt(guestCount),
      zone: zone || null,
      status: 'WAITING',
    }).select().single()

    if (error) throw error
    return NextResponse.json({ success: true, entry })
  } catch (error) {
    console.error('POST /api/waitlist error:', error)
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }
}

// PATCH — admin only (update waitlist status)
export async function PATCH(request: NextRequest) {
  const guard = await requireStaff(); if (guard instanceof Response) return guard
  try {
    const body = await request.json()
    const { id, status } = body

    const validStatuses = ['WAITING', 'NOTIFIED', 'BOOKED', 'EXPIRED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 })
    }

    const { data: entry, error } = await supabase
      .from('waitlist').update({ status }).eq('id', id).select().single()

    if (error) throw error
    return NextResponse.json({ success: true, entry })
  } catch (error) {
    console.error('PATCH /api/waitlist error:', error)
    return NextResponse.json({ error: 'Failed to update waitlist entry' }, { status: 500 })
  }
}
