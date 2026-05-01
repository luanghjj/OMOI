import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/auth'

// GET /api/preorders?bookingId= — get pre-orders for a booking
export async function GET(request: NextRequest) {
  const guard = await requireStaff(); if (guard instanceof Response) return guard
  try {
    const { prisma } = await import('@/lib/prisma')
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')

    if (!bookingId) {
      return NextResponse.json(
        { error: 'bookingId is required' },
        { status: 400 }
      )
    }

    const preOrders = await prisma.preOrder.findMany({
      where: { bookingId },
      include: { menuItem: true },
    })

    const total = preOrders.reduce(
      (sum, po) => sum + po.menuItem.price * po.quantity,
      0
    )

    return NextResponse.json({ preOrders, total })
  } catch (error) {
    console.error('GET /api/preorders error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pre-orders' },
      { status: 500 }
    )
  }
}

// POST /api/preorders — add pre-orders to a booking
export async function POST(request: NextRequest) {
  try {
    const { prisma } = await import('@/lib/prisma')
    const body = await request.json()
    const { bookingId, items } = body

    if (!bookingId || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'bookingId and items array are required' },
        { status: 400 }
      )
    }

    // Verify booking exists
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Clear existing pre-orders and create new ones
    await prisma.preOrder.deleteMany({ where: { bookingId } })

    const preOrders = await prisma.preOrder.createMany({
      data: items.map((item: { menuItemId: string; quantity: number; note?: string }) => ({
        bookingId,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        note: item.note || null,
      })),
    })

    return NextResponse.json({ success: true, count: preOrders.count })
  } catch (error) {
    console.error('POST /api/preorders error:', error)
    return NextResponse.json(
      { error: 'Failed to create pre-orders' },
      { status: 500 }
    )
  }
}
