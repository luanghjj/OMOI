/**
 * Simple in-memory rate limiter for API routes.
 * Not suitable for multi-instance deployments — use Redis in production.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 5 * 60 * 1000)

/**
 * Check rate limit for a given key.
 * @returns null if allowed, or { retryAfter } seconds if blocked
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { retryAfter: number } | null {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  entry.count++
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { retryAfter }
  }

  return null
}

/**
 * Extract client IP from request headers (works behind proxies)
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real
  return 'unknown'
}
