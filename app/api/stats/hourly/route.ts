import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireStaff } from '@/lib/auth'

// GET /api/stats/hourly — booking heatmap for last 30 days + today's peak hours
export async function GET() {
  const guard = await requireStaff(); if (guard instanceof Response) return guard
  try {
    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const dateFrom = thirtyDaysAgo.toISOString().split('T')[0]
    const today = now.toISOString().split('T')[0]

    // Get all bookings from last 30 days (non-cancelled)
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('date, startTime, guestCount, status')
      .gte('date', dateFrom)
      .in('status', ['CONFIRMED', 'SEATED', 'COMPLETED', 'PENDING'])
      .order('date', { ascending: true })

    if (error) throw error

    const allBookings = bookings || []

    // ── Today's peak hours ──────────────────────────────────────────
    const todayBookings = allBookings.filter(b => b.date === today || b.date?.startsWith(today))
    const todayByHour = new Map<string, { count: number; guests: number }>()

    todayBookings.forEach(b => {
      const hour = b.startTime?.substring(0, 2) + ':00'
      const existing = todayByHour.get(hour) || { count: 0, guests: 0 }
      existing.count++
      existing.guests += b.guestCount || 0
      todayByHour.set(hour, existing)
    })

    const todayPeaks = Array.from(todayByHour.entries())
      .map(([hour, data]) => ({ hour, ...data }))
      .sort((a, b) => a.hour.localeCompare(b.hour))

    // ── 30-day heatmap ──────────────────────────────────────────────
    // Count unique days in range
    const uniqueDays = new Set(allBookings.map(b => {
      const d = new Date(b.date)
      return d.getDay()
    }))

    const dayCount = new Map<number, number>()
    // Count actual calendar days per weekday in the 30-day range
    const cursor = new Date(thirtyDaysAgo)
    while (cursor <= now) {
      const dow = cursor.getDay()
      dayCount.set(dow, (dayCount.get(dow) || 0) + 1)
      cursor.setDate(cursor.getDate() + 1)
    }

    // Group by dayOfWeek + hour
    const heatmap = new Map<string, { day: number; hour: string; count: number; guests: number }>()

    allBookings.forEach(b => {
      const d = new Date(b.date)
      const dow = d.getDay()
      const hour = b.startTime?.substring(0, 2) + ':00'
      const key = `${dow}-${hour}`
      const existing = heatmap.get(key) || { day: dow, hour, count: 0, guests: 0 }
      existing.count++
      existing.guests += b.guestCount || 0
      heatmap.set(key, existing)
    })

    const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
    const slots = Array.from(heatmap.values())
      .map(slot => ({
        ...slot,
        dayLabel: DAYS[slot.day],
        avg: Math.round((slot.count / (dayCount.get(slot.day) || 1)) * 10) / 10,
      }))
      .sort((a, b) => a.avg - b.avg) // quiet first

    // Quiet slots = avg < 1
    const quietSlots = slots.filter(s => s.avg < 1 && s.day !== 1) // exclude Monday (closed)
    // Busy slots = avg >= 3
    const busySlots = slots.filter(s => s.avg >= 3).sort((a, b) => b.avg - a.avg)

    return NextResponse.json({
      today: todayPeaks,
      quietSlots: quietSlots.slice(0, 5),
      busySlots: busySlots.slice(0, 5),
      totalBookings30d: allBookings.length,
    })
  } catch (error) {
    console.error('GET /api/stats/hourly error:', error)
    return NextResponse.json({ today: [], quietSlots: [], busySlots: [], totalBookings30d: 0 })
  }
}
