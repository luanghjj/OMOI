import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireStaff } from '@/lib/auth'

// GET /api/customers/lookup?phone=xxx or ?email=xxx
export async function GET(request: NextRequest) {
  const guard = await requireStaff(); if (guard instanceof Response) return guard
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')
    const email = searchParams.get('email')

    if (!phone && !email) {
      return NextResponse.json({ error: 'Phone or email required' }, { status: 400 })
    }

    // Find customer by phone or email
    let customerQuery = supabase
      .from('customers')
      .select('id, name, phone, email, preferredZone, loyaltyPoints, createdAt')

    if (phone) {
      const normalizedPhone = phone.replace(/\s+/g, '').replace(/[()-]/g, '')
      customerQuery = customerQuery.eq('phone', normalizedPhone)
    } else if (email) {
      customerQuery = customerQuery.eq('email', email.toLowerCase().trim())
    }

    const { data: customer } = await customerQuery.single()

    if (!customer) {
      // Try direct search in bookings if customer not found
      let bookingQuery = supabase
        .from('bookings')
        .select('bookingCode, guestName, guestPhone, guestEmail, date, startTime, endTime, guestCount, status, specialNote')
        .order('date', { ascending: false })
        .limit(20)

      if (phone) {
        const normalizedPhone = phone.replace(/\s+/g, '').replace(/[()-]/g, '')
        bookingQuery = bookingQuery.eq('guestPhone', normalizedPhone)
      } else if (email) {
        bookingQuery = bookingQuery.eq('guestEmail', email.toLowerCase().trim())
      }

      const { data: bookings } = await bookingQuery

      if (!bookings || bookings.length === 0) {
        return NextResponse.json({ found: false, customer: null, bookings: [] })
      }

      return NextResponse.json({
        found: true,
        customer: {
          name: bookings[0].guestName,
          phone: bookings[0].guestPhone,
          email: bookings[0].guestEmail,
          createdAt: null,
          visitCount: bookings.filter(b => !['CANCELLED', 'NO_SHOW'].includes(b.status)).length,
          tier: bookings.length >= 10 ? 'VIP' : bookings.length >= 3 ? 'STAMMKUNDE' : 'NEUKUNDE',
        },
        bookings,
      })
    }

    // Customer found — get all bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('bookingCode, guestName, guestPhone, guestEmail, date, startTime, endTime, guestCount, status, specialNote')
      .eq('customerId', customer.id)
      .order('date', { ascending: false })
      .limit(50)

    const validBookings = (bookings || []).filter(b => !['CANCELLED', 'NO_SHOW'].includes(b.status))
    const visitCount = validBookings.length
    let tier: 'NEUKUNDE' | 'STAMMKUNDE' | 'VIP' = 'NEUKUNDE'
    if (visitCount >= 10) tier = 'VIP'
    else if (visitCount >= 3) tier = 'STAMMKUNDE'

    return NextResponse.json({
      found: true,
      customer: {
        ...customer,
        visitCount,
        tier,
      },
      bookings: bookings || [],
    })
  } catch (error) {
    console.error('GET /api/customers/lookup error:', error)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
