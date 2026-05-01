import { NextRequest, NextResponse } from 'next/server'

// GET /api/menu — list all available menu items
export async function GET() {
  try {
    const { prisma } = await import('@/lib/prisma')
    const items = await prisma.menuItem.findMany({
      where: { isAvailable: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })

    // Group by category
    const grouped: Record<string, typeof items> = {}
    for (const item of items) {
      if (!grouped[item.category]) grouped[item.category] = []
      grouped[item.category].push(item)
    }

    return NextResponse.json({ items, grouped })
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
