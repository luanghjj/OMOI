import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { generateId } from '@/lib/id'

// GET /api/staff — list all staff (OWNER only)
export async function GET() {
  const session = await getSession()
  if (!session || (session.role !== 'OWNER' && session.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('staff')
    .select('id, name, email, role')
    .order('role')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ staff: data })
}

// POST /api/staff — create new staff (OWNER only)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.role !== 'OWNER' && session.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, email, password, role } = await req.json()
  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: 'Alle Felder erforderlich' }, { status: 400 })
  }

  const validRoles = ['OWNER', 'MANAGER', 'STAFF', 'ADMIN']
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Ungültige Rolle' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const { data, error } = await supabase
    .from('staff')
    .insert({ id: generateId(), name, email: email.toLowerCase(), passwordHash, role })
    .select('id, name, email, role')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'E-Mail bereits vergeben' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ staff: data }, { status: 201 })
}
