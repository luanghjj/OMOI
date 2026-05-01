import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateId } from '@/lib/id'
import { requireStaff } from '@/lib/auth'

// PATCH /api/tables/[id] — update table
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireStaff(); if (guard instanceof Response) return guard
  try {
    const { id } = await params
    const body = await request.json()

    const allowed = ['number', 'name', 'zone', 'capacity', 'hasOutlet', 'hasNaturalLight', 'isActive', 'status', 'positionX', 'positionY']
    const updateData: Record<string, unknown> = {}
    for (const key of allowed) {
      if (body[key] !== undefined) updateData[key] = body[key]
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { data: table, error } = await supabase
      .from('tables')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, table })
  } catch (error) {
    console.error('PATCH /api/tables/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update table' }, { status: 500 })
  }
}

// DELETE /api/tables/[id] — deactivate table
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireStaff('MANAGER'); if (guard instanceof Response) return guard
  try {
    const { id } = await params

    // Soft delete: set isActive = false
    const { data: table, error } = await supabase
      .from('tables')
      .update({ isActive: false })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, table })
  } catch (error) {
    console.error('DELETE /api/tables/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete table' }, { status: 500 })
  }
}
