import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// Routes that require OWNER role
const OWNER_ONLY = ['/admin/settings', '/admin/staff']
// Routes that require MANAGER or above
const MANAGER_PLUS = ['/admin/tables']
// Routes accessible to any logged-in staff
const STAFF_PLUS = ['/admin']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only protect /admin routes (exclude /admin/login)
  if (!pathname.startsWith('/admin') || pathname === '/admin/login') {
    return NextResponse.next()
  }

  // Read session token
  const token = req.cookies.get('omoi_session')?.value
  const session = token ? await verifyToken(token) : null

  // Not logged in → redirect to login
  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/admin/login'
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  const role = session.role
  const hierarchy: Record<string, number> = { STAFF: 1, MANAGER: 3, ADMIN: 4, OWNER: 4 }
  const level = hierarchy[role] || 0

  // Check OWNER-only routes
  if (OWNER_ONLY.some(p => pathname.startsWith(p))) {
    if (level < 4) {
      return NextResponse.redirect(new URL('/admin?error=forbidden', req.url))
    }
  }

  // Check MANAGER+ routes
  if (MANAGER_PLUS.some(p => pathname.startsWith(p))) {
    if (level < 3) {
      return NextResponse.redirect(new URL('/admin?error=forbidden', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
