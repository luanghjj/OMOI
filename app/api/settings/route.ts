import { NextRequest, NextResponse } from 'next/server'
import { getSettings, updateSettings } from '@/lib/settings'
import { requireStaff } from '@/lib/auth'

export async function GET() {
  return NextResponse.json({ settings: await getSettings() })
}

export async function PUT(request: NextRequest) {
  const guard = await requireStaff('OWNER'); if (guard instanceof Response) return guard
  try {
    const body    = await request.json()
    const updated = await updateSettings(body)
    return NextResponse.json({ settings: updated })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 })
  }
}
