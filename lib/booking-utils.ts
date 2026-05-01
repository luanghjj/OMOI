import { supabase } from './supabase'

/**
 * Generate a unique booking code: OM + YYMM + "-" + 3-digit sequence
 * Example: OM2604-001, OM2604-002
 */
export async function generateBookingCode(): Promise<string> {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const prefix = `OM${yy}${mm}`

  const { count } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .like('bookingCode', `${prefix}%`)

  const seq = String((count || 0) + 1).padStart(3, '0')
  return `${prefix}-${seq}`
}

/**
 * Check if a table is available for a given date and time range.
 */
export async function isSlotAvailable(
  tableId: string,
  date: Date,
  startTime: string,
  endTime?: string
): Promise<boolean> {
  const dateStr = date.toISOString().split('T')[0]
  const end = endTime || calculateEndTime(startTime, 2)

  const { data } = await supabase
    .from('bookings')
    .select('id')
    .eq('date', dateStr)
    .in('status', ['PENDING', 'CONFIRMED', 'SEATED'])
    .eq('tableId', tableId)
    .lt('startTime', end)
    .gt('endTime', startTime)
    .limit(1)

  return !data || data.length === 0
}





/**
 * Calculate end time by adding hours to start time
 */
export function calculateEndTime(startTime: string, hours: number): string {
  const [h, m] = startTime.split(':').map(Number)
  const totalMinutes = h * 60 + m + hours * 60
  const endH = Math.floor(totalMinutes / 60) % 24
  const endM = totalMinutes % 60
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
}

/**
 * Get opening hours for a specific day of the week.
 * Returns null if closed (Monday = day 1).
 */
export function getOpeningHours(date: Date): { open: string; close: string } | null {
  const day = date.getDay() // 0=Sun, 1=Mon, ..., 6=Sat

  if (day === 1) return null // Monday = closed

  // Sat (6) and Sun (0): 09:00–18:00
  if (day === 0 || day === 6) {
    return { open: '09:00', close: '18:00' }
  }

  // Tue-Fri: 08:00–18:00
  return { open: '08:00', close: '18:00' }
}

/**
 * Check if a given date is a business day (not Monday)
 */
export function isBusinessDay(date: Date): boolean {
  return date.getDay() !== 1 // 1 = Monday
}

/**
 * Generate available time slots for a given date
 */
export function getTimeSlots(date: Date): string[] {
  const hours = getOpeningHours(date)
  if (!hours) return []

  const slots: string[] = []
  const [openH] = hours.open.split(':').map(Number)
  const [closeH] = hours.close.split(':').map(Number)

  // Generate 30-minute slots, last booking 2h before close
  for (let h = openH; h <= closeH - 2; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    if (h < closeH - 2 || (h === closeH - 2)) {
      slots.push(`${String(h).padStart(2, '0')}:30`)
    }
  }

  return slots
}

/**
 * Validate Vietnamese phone number format
 */
export function isValidVietnamesePhone(phone: string): boolean {
  return /^0[0-9]{9}$/.test(phone)
}
