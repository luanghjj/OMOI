import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/menu — list all available menu items (public)
export async function GET() {
  try {
    const { data: items, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('isAvailable', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error

    // Group by category
    const grouped: Record<string, typeof items> = {}
    for (const item of (items || [])) {
      if (!grouped[item.category]) grouped[item.category] = []
      grouped[item.category].push(item)
    }

    return NextResponse.json({ items: items || [], grouped })
  } catch (error) {
    console.error('GET /api/menu error:', error)
    const { mockMenu } = await import('@/lib/mock-data')
    const grouped: Record<string, typeof mockMenu> = {}
    for (const item of mockMenu) {
      if (!grouped[item.category]) grouped[item.category] = []
      grouped[item.category].push(item)
    }
    return NextResponse.json({ items: mockMenu, grouped, _mock: true })
  }
}
