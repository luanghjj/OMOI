import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// PATCH /api/staff/[id] — update role or reset password (OWNER only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.role !== 'OWNER' && session.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const updates: Record<string, string> = {}

  if (body.role) {
    const validRoles = ['OWNER', 'MANAGER', 'STAFF', 'ADMIN']
    if (!validRoles.includes(body.role)) {
      return NextResponse.json({ error: 'Ungültige Rolle' }, { status: 400 })
    }
    updates.role = body.role
  }

  if (body.password) {
    updates.passwordHash = await bcrypt.hash(body.password, 10)
  }

  if (body.name) updates.name = body.name

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Keine Änderungen' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('staff')
    .update(updates)
    .eq('id', id)
    .select('id, name, email, role')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ staff: data })
}

// DELETE /api/staff/[id] — delete staff member (OWNER only, cannot delete self)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.role !== 'OWNER' && session.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  if (id === session.id) {
    return NextResponse.json({ error: 'Eigenes Konto kann nicht gelöscht werden' }, { status: 400 })
  }

  const { error } = await supabase.from('staff').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
