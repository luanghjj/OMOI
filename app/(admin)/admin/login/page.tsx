'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Anmeldung fehlgeschlagen')
        return
      }
      router.push(from)
      router.refresh()
    } catch {
      setError('Netzwerkfehler. Bitte erneut versuchen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f5f0e8] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <img
            src="/images/omoi-logo.png"
            alt="OMOI"
            className="h-10 object-contain mx-auto mb-4"
          />
          <h1 className="text-2xl font-black text-[#3b1f0a] tracking-tight">Team-Zugang</h1>
          <p className="text-sm text-[#a89070] mt-1">Melden Sie sich mit Ihrem Mitarbeiterkonto an</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(59,31,10,0.10)] overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#8B6914] via-[#C4975C] to-[#8B6914]" />
          <form onSubmit={handleSubmit} className="p-8 space-y-5">

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
                <span className="material-symbols-outlined text-base">error</span>
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="text-[11px] font-bold text-[#a89070] uppercase tracking-widest block mb-1.5">
                E-Mail
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c4b090] text-lg">mail</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@omoi.cafe"
                  className="w-full pl-11 pr-4 py-3 bg-[#faf6f0] border border-[#e8dcc8] rounded-xl text-[#3b1f0a] text-sm placeholder:text-[#c4b090] focus:outline-none focus:ring-2 focus:ring-[#C4975C]/40 focus:border-[#C4975C] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-[11px] font-bold text-[#a89070] uppercase tracking-widest block mb-1.5">
                Passwort
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c4b090] text-lg">lock</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 bg-[#faf6f0] border border-[#e8dcc8] rounded-xl text-[#3b1f0a] text-sm placeholder:text-[#c4b090] focus:outline-none focus:ring-2 focus:ring-[#C4975C]/40 focus:border-[#C4975C] transition-all"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#c4b090] hover:text-[#8B6914] transition-colors">
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#3b1f0a] text-white font-bold rounded-xl hover:bg-[#5a3018] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Anmelden…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">login</span>
                  Anmelden
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#c4b090] mt-6">
          OMOI · 思い — Internes Verwaltungssystem
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f0e8]" />}>
      <LoginForm />
    </Suspense>
  )
}
