import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireStaff } from '@/lib/auth'

// GET /api/customers/[phone] — lookup customer by phone number
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const guard = await requireStaff(); if (guard instanceof Response) return guard
  try {
    const { phone } = await params
    const normalizedPhone = phone.replace(/\s+/g, '').replace(/[()-]/g, '')

    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, phone, email, preferredZone, loyaltyPoints, createdAt')
      .eq('phone', normalizedPhone)
      .single()

    if (!customer) {
      return NextResponse.json({ found: false, customer: null, visitCount: 0 })
    }

    // Count bookings (exclude CANCELLED/NO_SHOW)
    const { count } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('customerId', customer.id)
      .not('status', 'in', '("CANCELLED","NO_SHOW")')

    // Get last 5 bookings for history
    const { data: recentBookings } = await supabase
      .from('bookings')
      .select('bookingCode, date, startTime, guestCount, status, specialNote')
      .eq('customerId', customer.id)
      .order('date', { ascending: false })
      .limit(5)

    const visitCount = count || 0
    let tier: 'NEUKUNDE' | 'STAMMKUNDE' | 'VIP' = 'NEUKUNDE'
    if (visitCount >= 10) tier = 'VIP'
    else if (visitCount >= 3) tier = 'STAMMKUNDE'

    return NextResponse.json({
      found: true,
      customer: {
        ...customer,
        visitCount,
        tier,
        recentBookings: recentBookings || [],
      },
    })
  } catch (error) {
    console.error('GET /api/customers/[phone] error:', error)
    return NextResponse.json({ error: 'Failed to lookup customer' }, { status: 500 })
  }
}
