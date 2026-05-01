import { supabase } from './supabase'
import type { ConfirmationMode } from './seating-planner'

export interface CafeSettings {
  slotDuration: number
  bookingDuration: number
  confirmationMode: ConfirmationMode
  maxAutoConfirmGuests: number
  openTuFr: string
  closeTuFr: string
  openSaSo: string
  closeSaSo: string
  // Neukunden-Aktion
  firstTimePromoEnabled: boolean
  firstTimePromoType: 'PERCENT' | 'PRODUCT'
  firstTimePromoPercent: number
  firstTimePromoProductId: string | null
  firstTimePromoMessage: string
  // Restaurant Details
  restaurantName: string
  restaurantAddress: string
  restaurantPhone: string
  restaurantEmail: string
  restaurantWebsite: string
  restaurantGoogleMaps: string
  restaurantInstagram: string
  restaurantFacebook: string
  // Amenities
  amenityOutdoor: boolean
  amenityWifi: boolean
  amenityKidFriendly: boolean
  amenityBarrierfree: boolean
  amenityParking: boolean
  amenityReservation: boolean
  amenityTakeaway: boolean
  amenityCreditCard: boolean
}

export interface BlockedSlot {
  id: string
  date: string
  dayOfWeek: number | null
  startTime: string
  endTime: string
  reason: string
}

const SETTINGS_KEY = 'cafe'

const defaultSettings: CafeSettings = {
  slotDuration: 30,
  bookingDuration: 120,
  confirmationMode: 'AUTO',
  maxAutoConfirmGuests: 16,
  openTuFr: '10:00',
  closeTuFr: '20:00',
  openSaSo: '11:00',
  closeSaSo: '22:00',
  // Promo defaults
  firstTimePromoEnabled: false,
  firstTimePromoType: 'PERCENT',
  firstTimePromoPercent: 10,
  firstTimePromoProductId: null,
  firstTimePromoMessage: 'Willkommen bei OMOI! Als Neukunde erhalten Sie einen besonderen Rabatt.',
  // Restaurant Details defaults
  restaurantName: 'OMOI · 思い',
  restaurantAddress: 'Hauptstätter Str. 57, 70178 Stuttgart',
  restaurantPhone: '',
  restaurantEmail: '',
  restaurantWebsite: '',
  restaurantGoogleMaps: 'https://maps.app.goo.gl/Vy3wRgdSbauSvcxT9',
  restaurantInstagram: '',
  restaurantFacebook: '',
  // Amenities defaults
  amenityOutdoor: false,
  amenityWifi: true,
  amenityKidFriendly: false,
  amenityBarrierfree: false,
  amenityParking: false,
  amenityReservation: true,
  amenityTakeaway: false,
  amenityCreditCard: true,
}

let _blockedSlots: BlockedSlot[] = []

export async function getSettings(): Promise<CafeSettings> {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .single()

    if (!data || typeof data.value !== 'object' || data.value === null || Array.isArray(data.value)) {
      return { ...defaultSettings }
    }
    return { ...defaultSettings, ...(data.value as Partial<CafeSettings>) }
  } catch {
    return { ...defaultSettings }
  }
}

export async function updateSettings(partial: Partial<CafeSettings>): Promise<CafeSettings> {
  const current = await getSettings()
  const next: CafeSettings = { ...current, ...partial }

  const { data: existing } = await supabase
    .from('app_settings').select('key').eq('key', SETTINGS_KEY).single()

  if (existing) {
    await supabase.from('app_settings').update({ value: next }).eq('key', SETTINGS_KEY)
  } else {
    await supabase.from('app_settings').insert({ key: SETTINGS_KEY, value: next })
  }

  return { ...next }
}

export function getBlockedSlots(): BlockedSlot[] { return [..._blockedSlots] }

export function addBlockedSlot(slot: Omit<BlockedSlot, 'id'>): BlockedSlot {
  const newSlot: BlockedSlot = { ...slot, id: `blk-${Date.now()}` }
  _blockedSlots.push(newSlot)
  return newSlot
}

export function removeBlockedSlot(id: string): void {
  _blockedSlots = _blockedSlots.filter(s => s.id !== id)
}

export function isTimeBlocked(date: string, time: string): boolean {
  const dateObj = new Date(date)
  const dow = dateObj.getDay()
  return _blockedSlots.some(slot => {
    const matchesDate = slot.date === date || slot.date === '*'
    const matchesDow = slot.dayOfWeek !== null && slot.dayOfWeek === dow
    if (!matchesDate && !matchesDow) return false
    return time >= slot.startTime && time < slot.endTime
  })
}
