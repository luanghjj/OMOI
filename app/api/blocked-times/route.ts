import { NextRequest, NextResponse } from 'next/server'
import { getBlockedSlots, addBlockedSlot, removeBlockedSlot } from '@/lib/settings'
import { requireStaff } from '@/lib/auth'

// GET /api/blocked-times — public (booking page needs this)
export async function GET() {
  return NextResponse.json({ blockedSlots: getBlockedSlots() })
}

// POST /api/blocked-times  — add a new block (OWNER only)
export async function POST(request: NextRequest) {
  const guard = await requireStaff('OWNER'); if (guard instanceof Response) return guard
  try {
    const body = await request.json()
    const { date, dayOfWeek, startTime, endTime, reason } = body

    if (!startTime || !endTime || !reason) {
      return NextResponse.json({ error: 'startTime, endTime and reason are required' }, { status: 400 })
    }
    if (startTime >= endTime) {
      return NextResponse.json({ error: 'endTime must be after startTime' }, { status: 400 })
    }

    const slot = addBlockedSlot({
      date:      date || '*',
      dayOfWeek: dayOfWeek ?? null,
      startTime,
      endTime,
      reason,
    })

    return NextResponse.json({ slot }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 })
  }
}

// DELETE /api/blocked-times?id=blk-xxx (OWNER only)
export async function DELETE(request: NextRequest) {
  const guard = await requireStaff('OWNER'); if (guard instanceof Response) return guard
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  removeBlockedSlot(id)
  return NextResponse.json({ success: true })
}
