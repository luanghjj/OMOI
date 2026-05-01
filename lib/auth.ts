import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export type StaffRole = 'OWNER' | 'MANAGER' | 'STAFF' | 'ADMIN'

export interface Session {
  id: string
  name: string
  email: string
  role: StaffRole
}

const COOKIE_NAME = 'omoi_session'
const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET!
)

export async function createToken(session: Session): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .setIssuedAt()
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as Session
  } catch {
    return null
  }
}

export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null
    return verifyToken(token)
  } catch {
    return null
  }
}

// Role hierarchy check — ADMIN = OWNER level (legacy DB enum support)
export function hasRole(session: Session | null, minRole: StaffRole): boolean {
  if (!session) return false
  const hierarchy: Record<StaffRole, number> = {
    STAFF: 1,
    ADMIN: 4,   // ADMIN = OWNER level (existing DB value)
    MANAGER: 3,
    OWNER: 4,
  }
  const userLevel = hierarchy[session.role] ?? 0
  const requiredLevel = hierarchy[minRole] ?? 0
  return userLevel >= requiredLevel
}

export const ROLE_LABELS: Record<StaffRole, string> = {
  STAFF:   'Mitarbeiter',
  ADMIN:   'Admin',
  MANAGER: 'Manager',
  OWNER:   'Inhaber',
}

export const ROLE_COLORS: Record<StaffRole, string> = {
  STAFF:   'bg-stone-100 text-stone-700',
  ADMIN:   'bg-amber-100 text-amber-800',
  MANAGER: 'bg-blue-100 text-blue-800',
  OWNER:   'bg-purple-100 text-purple-800',
}

export const COOKIE_NAME_EXPORT = COOKIE_NAME

// ── API route guard ──────────────────────────────────────────────────
// Returns session if valid, or a NextResponse error (401/403).
// Usage: const guard = await requireStaff(); if (guard instanceof Response) return guard;
import { NextResponse } from 'next/server'

export async function requireStaff(minRole: StaffRole = 'STAFF'): Promise<Session | NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
  }
  if (!hasRole(session, minRole)) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
  }
  return session
}
