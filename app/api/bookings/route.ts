import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateBookingCode, calculateEndTime } from '@/lib/booking-utils'
import { getSettings } from '@/lib/settings'
import { planSeating } from '@/lib/seating-planner'
import { generateId } from '@/lib/id'
import { sendBookingConfirmation } from '@/lib/email'
import { requireStaff } from '@/lib/auth'
import { rateLimit, getClientIP } from '@/lib/rate-limit'

// GET /api/bookings?date=&status=&zone=
export async function GET(request: NextRequest) {
  const guard = await requireStaff(); if (guard instanceof Response) return guard
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '200')

    let query = supabase
      .from('bookings')
      .select(`
        *,
        table:tables(*),
        customer:customers(id, name, phone, preferredZone, createdAt),
        assignedTables:booking_tables(*, table:tables(*)),
        preOrders:pre_orders(*, menuItem:menu_items(*))
      `)
      .order('date', { ascending: true })
      .order('startTime', { ascending: true })
      .limit(limit)

    if (dateStr) query = query.eq('date', dateStr)
    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ bookings: data || [] })
  } catch (error) {
    console.error('GET /api/bookings error:', error)
    return NextResponse.json({ bookings: [], _mock: true })
  }
}

// ── Customer auto-link helper ─────────────────────────────────────────
async function findOrCreateCustomer(phone: string, name: string, email?: string | null) {
  // Normalize phone
  const normalizedPhone = phone.replace(/\s+/g, '').replace(/[()-]/g, '')

  // Try to find existing customer
  const { data: existing } = await supabase
    .from('customers')
    .select('id, name, phone, email, preferredZone, createdAt')
    .eq('phone', normalizedPhone)
    .single()

  if (existing) {
    // Count previous completed bookings (not CANCELLED/NO_SHOW)
    const { count } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('customerId', existing.id)
      .not('status', 'in', '("CANCELLED","NO_SHOW")')

    return {
      customerId: existing.id,
      isFirstTime: false,
      visitCount: (count || 0) + 1, // +1 for current booking
      customerSince: existing.createdAt,
      preferredZone: existing.preferredZone,
    }
  }

  // Create new customer
  const customerId = generateId()
  const { error } = await supabase.from('customers').insert({
    id: customerId,
    name,
    phone: normalizedPhone,
    email: email || null,
    loyaltyPoints: 0,
  })

  if (error) {
    console.error('Failed to create customer:', error)
    return { customerId: null, isFirstTime: true, visitCount: 1, customerSince: null, preferredZone: null }
  }

  return {
    customerId,
    isFirstTime: true,
    visitCount: 1,
    customerSince: new Date().toISOString(),
    preferredZone: null,
  }
}

// POST /api/bookings
export async function POST(request: NextRequest) {
  // Rate limit: 10 bookings per IP per hour
  const ip = getClientIP(request)
  const limited = rateLimit(`booking:${ip}`, 10, 60 * 60 * 1000)
  if (limited) {
    return NextResponse.json(
      { error: 'Zu viele Reservierungen. Bitte versuchen Sie es später erneut.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { tableId, date, time, guestCount, name, phone, email, zone, specialNote, preOrders } = body

    if (!date || !time || !guestCount || !name || !phone) {
      return NextResponse.json({ error: 'Missing required fields: date, time, guestCount, name, phone' }, { status: 400 })
    }

    if (!/^[\d+\s()\-–]{3,}$/.test(phone)) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    // Input length & sanitization
    if (name.length > 100 || (email && email.length > 200) || (specialNote && specialNote.length > 500)) {
      return NextResponse.json({ error: 'Input too long' }, { status: 400 })
    }
    const sanitize = (s: string) => s.replace(/[<>]/g, '').trim()
    const safeName = sanitize(name)
    const safeNote = specialNote ? sanitize(specialNote) : ''

    const bookingDate = new Date(date)
    if (bookingDate.getDay() === 1) {
      return NextResponse.json({ error: 'OMOI ist montags geschlossen (Ruhetag)' }, { status: 400 })
    }

    const settings = await getSettings()
    const endTime = calculateEndTime(time, settings.bookingDuration / 60)
    const requestedTableId = tableId || null
    let requestedTable: { id: string; number: number } | null = null

    if (requestedTableId) {
      const { data: table } = await supabase.from('tables').select('*').eq('id', requestedTableId).single()
      if (!table) return NextResponse.json({ error: 'Table not found' }, { status: 404 })
      requestedTable = table
      if (table.capacity < guestCount) {
        return NextResponse.json({ error: `Table capacity is ${table.capacity}, but ${guestCount} guests requested` }, { status: 400 })
      }

      const { data: conflicts } = await supabase
        .from('bookings')
        .select('id')
        .eq('date', date)
        .in('status', ['PENDING', 'CONFIRMED', 'SEATED'])
        .eq('tableId', requestedTableId)
        .lt('startTime', endTime)
        .gt('endTime', time)

      if (conflicts && conflicts.length > 0) {
        return NextResponse.json({ error: 'This table is already booked for the selected time slot' }, { status: 409 })
      }
    }

    // ── Auto-link customer ──────────────────────────────────────────
    const customerInfo = await findOrCreateCustomer(phone, name, email)

    let bookingStatus: 'PENDING' | 'CONFIRMED' = 'PENDING'
    let autoDecision = {
      canAutoConfirm: false, reason: 'Manual confirmation mode',
      remainingSeats: 0, tableIds: [] as string[], tableNumbers: [] as number[], label: 'Keine Tischzuweisung',
    }

    if (settings.confirmationMode === 'AUTO') {
      if (requestedTableId) {
        bookingStatus = 'CONFIRMED'
        autoDecision = {
          canAutoConfirm: true, reason: 'Specific table is available', remainingSeats: 0,
          tableIds: [requestedTableId], tableNumbers: requestedTable ? [requestedTable.number] : [],
          label: requestedTable ? String(requestedTable.number) : 'Tisch zugewiesen',
        }
      } else {
        const [{ data: activeTables }, { data: overlappingBookings }] = await Promise.all([
          supabase.from('tables').select('id, number, capacity').eq('isActive', true),
          supabase.from('bookings')
            .select('tableId, assignedTables:booking_tables(tableId)')
            .eq('date', date)
            .in('status', ['PENDING', 'CONFIRMED', 'SEATED'])
            .lt('startTime', endTime)
            .gt('endTime', time),
        ])

        const occupiedTableIds = new Set<string>()
        ;(overlappingBookings || []).forEach((b: { tableId: string | null; assignedTables: { tableId: string }[] }) => {
          if (b.tableId) occupiedTableIds.add(b.tableId)
          b.assignedTables?.forEach((a) => occupiedTableIds.add(a.tableId))
        })

        autoDecision = planSeating(guestCount, activeTables || [], occupiedTableIds, settings.maxAutoConfirmGuests)
        bookingStatus = autoDecision.canAutoConfirm ? 'CONFIRMED' : 'PENDING'
      }
    }

    const selectedTableIds = requestedTableId
      ? [requestedTableId]
      : bookingStatus === 'CONFIRMED' ? autoDecision.tableIds : []
    const primaryTableId = selectedTableIds[0] || null

    const bookingCode = await generateBookingCode()
    const depositRequired = guestCount >= 4
    const depositAmount = depositRequired ? 50000 : 0
    const bookingId = generateId()

    const { data: booking, error: bookingError } = await supabase.from('bookings').insert({
      id: bookingId,
      bookingCode,
      customerId: customerInfo.customerId,
      tableId: primaryTableId,
      date,
      startTime: time,
      endTime,
      guestCount,
      guestName: name,
      guestPhone: phone,
      guestEmail: email || null,
      specialNote: zone ? `[Wunschbereich: ${zone}]${specialNote ? ' ' + specialNote : ''}` : (specialNote || null),
      status: bookingStatus,
      depositAmount,
    }).select().single()

    if (bookingError || !booking) {
      throw bookingError || new Error('Booking creation failed')
    }

    if (selectedTableIds.length > 0) {
      await supabase.from('booking_tables').insert(
        selectedTableIds.map((tid) => ({ id: generateId(), bookingId: booking.id, tableId: tid }))
      )
    }

    if (preOrders && Array.isArray(preOrders) && preOrders.length > 0) {
      await supabase.from('pre_orders').insert(
        preOrders.map((po: { menuItemId: string; quantity: number; note?: string }) => ({
          id: generateId(), bookingId: booking.id, menuItemId: po.menuItemId, quantity: po.quantity, note: po.note || null,
        }))
      )
    }

    // ── First-time promo ────────────────────────────────────────────
    let firstTimePromo = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = settings as any
    if (customerInfo.isFirstTime && s.firstTimePromoEnabled) {
      if (s.firstTimePromoType === 'PERCENT') {
        firstTimePromo = { type: 'PERCENT', percent: s.firstTimePromoPercent, message: s.firstTimePromoMessage || '' }
      } else if (s.firstTimePromoType === 'PRODUCT') {
        // Fetch product name
        let productName = ''
        if (s.firstTimePromoProductId) {
          const { data: product } = await supabase.from('menu_items').select('name').eq('id', s.firstTimePromoProductId).single()
          productName = product?.name || ''
        }
        firstTimePromo = { type: 'PRODUCT', productName, message: s.firstTimePromoMessage || '' }
      }
    }

    // ── Send confirmation email (non-blocking) ────────────────────
    sendBookingConfirmation({
      guestName: name,
      guestEmail: email || '',
      bookingCode: booking.bookingCode,
      date,
      startTime: time,
      endTime,
      guestCount,
      status: booking.status as 'PENDING' | 'CONFIRMED',
      specialNote: specialNote || undefined,
      firstTimePromo: firstTimePromo as { type: 'PERCENT' | 'PRODUCT'; percent?: number; productName?: string; message?: string } | null,
      restaurantName: (s.restaurantName as string) || undefined,
      restaurantAddress: (s.restaurantAddress as string) || undefined,
      restaurantPhone: (s.restaurantPhone as string) || undefined,
    }).catch(err => console.error('[Email] Background send failed:', err))

    return NextResponse.json({
      bookingCode: booking.bookingCode, bookingId: booking.id,
      depositRequired, depositAmount, status: booking.status,
      confirmationMode: settings.confirmationMode,
      autoConfirmed: booking.status === 'CONFIRMED',
      manualReview: booking.status === 'PENDING',
      seatingDecision: autoDecision,
      // Customer info
      isFirstTime: customerInfo.isFirstTime,
      visitCount: customerInfo.visitCount,
      firstTimePromo,
    })
  } catch (error) {
    console.error('POST /api/bookings error:', error)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}
