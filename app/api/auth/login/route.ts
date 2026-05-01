import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { createToken, type StaffRole } from '@/lib/auth'
import { rateLimit, getClientIP } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  // Rate limit: 5 login attempts per IP per 15 minutes
  const ip = getClientIP(req)
  const limited = rateLimit(`login:${ip}`, 5, 15 * 60 * 1000)
  if (limited) {
    return NextResponse.json(
      { error: 'Zu viele Anmeldeversuche. Bitte warten Sie ' + limited.retryAfter + ' Sekunden.' },
      { status: 429 }
    )
  }

  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email und Passwort erforderlich' }, { status: 400 })
    }

    const { data: staff, error } = await supabase
      .from('staff')
      .select('id, name, email, passwordHash, role')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error || !staff) {
      return NextResponse.json({ error: 'Ungültige Anmeldedaten' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, staff.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Ungültige Anmeldedaten' }, { status: 401 })
    }

    const token = await createToken({
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role as StaffRole,
    })

    const res = NextResponse.json({
      ok: true,
      name: staff.name,
      role: staff.role,
    })

    res.cookies.set('omoi_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8h
      path: '/',
    })

    return res
  } catch (err) {
    console.error('[Auth] Login error:', err)
    return NextResponse.json({ error: 'Server-Fehler' }, { status: 500 })
  }
}
