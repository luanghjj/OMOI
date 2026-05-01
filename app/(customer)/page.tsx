'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

interface SiteSettings {
  openTuFr: string; closeTuFr: string
  openSaSo: string; closeSaSo: string
  restaurantName: string; restaurantAddress: string
  restaurantPhone: string; restaurantEmail: string
  restaurantWebsite: string; restaurantGoogleMaps: string
  restaurantInstagram: string; restaurantFacebook: string
  amenityOutdoor: boolean; amenityWifi: boolean
  amenityKidFriendly: boolean; amenityBarrierfree: boolean
  amenityParking: boolean; amenityReservation: boolean
  amenityTakeaway: boolean; amenityCreditCard: boolean
}

const defaultSite: SiteSettings = {
  openTuFr: '10:00', closeTuFr: '20:00', openSaSo: '11:00', closeSaSo: '22:00',
  restaurantName: 'OMOI · 思い', restaurantAddress: 'Hauptstätter Str. 57, 70178 Stuttgart',
  restaurantPhone: '', restaurantEmail: '', restaurantWebsite: '',
  restaurantGoogleMaps: 'https://maps.app.goo.gl/Vy3wRgdSbauSvcxT9',
  restaurantInstagram: '', restaurantFacebook: '',
  amenityOutdoor: false, amenityWifi: true, amenityKidFriendly: false,
  amenityBarrierfree: false, amenityParking: false, amenityReservation: true,
  amenityTakeaway: false, amenityCreditCard: true,
}

export default function HomePage() {
  const [date, setDate] = useState('')
  const [guests, setGuests] = useState('2')
  const [time, setTime] = useState('10:00')
  const [today, setToday] = useState('')
  const [site, setSite] = useState<SiteSettings>(defaultSite)

  useEffect(() => {
    setToday(new Date().toISOString().split('T')[0])
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.settings) setSite(prev => ({ ...prev, ...d.settings }))
    }).catch(() => {})
  }, [])

  // Determine if currently open
  function getOpenStatus(): { isOpen: boolean; label: string; todayHours: string } {
    const now = new Date()
    const dow = now.getDay()
    if (dow === 1) return { isOpen: false, label: 'Ruhetag', todayHours: 'Montag: Ruhetag' }

    const isWeekend = dow === 0 || dow === 6
    const openTime = isWeekend ? site.openSaSo : site.openTuFr
    const closeTime = isWeekend ? site.closeSaSo : site.closeTuFr
    const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const isOpen = nowStr >= openTime && nowStr < closeTime

    return {
      isOpen,
      label: isOpen ? `Geöffnet bis ${closeTime}` : `Öffnet um ${openTime}`,
      todayHours: `${openTime} – ${closeTime} Uhr`,
    }
  }

  const status = getOpenStatus()

  const amenities = [
    { key: 'amenityOutdoor', icon: 'deck', label: 'Außenbereich' },
    { key: 'amenityWifi', icon: 'wifi', label: 'WLAN' },
    { key: 'amenityKidFriendly', icon: 'child_care', label: 'Kinderfreundlich' },
    { key: 'amenityBarrierfree', icon: 'accessible', label: 'Barrierefrei' },
    { key: 'amenityParking', icon: 'local_parking', label: 'Parkplatz' },
    { key: 'amenityReservation', icon: 'event_seat', label: 'Reservierung' },
    { key: 'amenityTakeaway', icon: 'takeout_dining', label: 'Takeaway' },
    { key: 'amenityCreditCard', icon: 'credit_card', label: 'Kartenzahlung' },
  ].filter(a => site[a.key as keyof SiteSettings] as boolean)

  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-[85vh] w-full overflow-hidden -mt-16">
        <img
          alt="OMOI Cafe Innenraum"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center 40%' }}
          src="/images/hero-cafe.jpg"
        />
        <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-center px-6">
          <img src="/images/omoi-logo.png" alt="OMOI" className="h-12 md:h-16 object-contain mb-8 invert brightness-200" />
          <h2 className="text-white text-4xl md:text-6xl font-bold mb-6 max-w-3xl leading-tight">
            Einfach reservieren — Vollständig genießen
          </h2>
          <p className="text-white/90 text-lg md:text-xl max-w-xl">
            Entdecken Sie den raffinierten Raum und die ursprünglichen Matcha-Aromen mitten in der Stadt.
          </p>
        </div>
      </section>

      {/* Schnellbuchung */}
      <div className="relative z-20 -mt-16 px-4 md:px-6 max-w-5xl mx-auto">
        <div className="bg-surface-container-lowest p-6 md:p-8 rounded-[2rem] shadow-xl border border-outline-variant flex flex-col md:flex-row gap-6 items-end">
          <div className="w-full space-y-2">
            <label className="text-sm font-semibold text-on-surface-variant block ml-1 uppercase tracking-wider">Datum</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-primary-container">calendar_today</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={today}
                className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low border-none rounded-xl text-on-surface focus:ring-2 focus:ring-on-primary-container"
              />
            </div>
          </div>

          <div className="w-full space-y-2">
            <label className="text-sm font-semibold text-on-surface-variant block ml-1 uppercase tracking-wider">Gäste</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-primary-container">group</span>
              <select
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low border-none rounded-xl text-on-surface focus:ring-2 focus:ring-on-primary-container appearance-none"
              >
                <option value="1">1 Gast</option>
                <option value="2">2 Gäste</option>
                <option value="4">4 Gäste</option>
                <option value="6">6 Gäste</option>
              </select>
            </div>
          </div>

          <div className="w-full space-y-2">
            <label className="text-sm font-semibold text-on-surface-variant block ml-1 uppercase tracking-wider">Uhrzeit</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-primary-container">schedule</span>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low border-none rounded-xl text-on-surface focus:ring-2 focus:ring-on-primary-container appearance-none"
              >
                <option value="08:00">08:00</option>
                <option value="09:00">09:00</option>
                <option value="10:00">10:00</option>
                <option value="11:00">11:00</option>
                <option value="12:00">12:00</option>
                <option value="13:00">13:00</option>
                <option value="14:00">14:00</option>
                <option value="15:00">15:00</option>
                <option value="16:00">16:00</option>
              </select>
            </div>
          </div>

          <Link
            href="/booking"
            className="w-full md:w-auto px-10 py-4 bg-primary-container text-white font-bold rounded-xl hover:bg-primary transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg"
          >
            <span>Tisch finden</span>
            <span className="material-symbols-outlined">search</span>
          </Link>
        </div>
      </div>

      {/* ── Details Section ──────────────────────── */}
      <section className="py-16 px-4 md:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left — Info */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold text-on-surface">Details</h2>

            {/* Open status */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-on-surface-variant">schedule</span>
                <span className="font-semibold text-on-surface">{status.label}</span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                status.isOpen
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : 'bg-red-100 text-red-600 border-red-200'
              }`}>
                {status.isOpen ? 'Geöffnet' : 'Geschlossen'}
              </span>
            </div>

            {/* Today hours */}
            <div className="flex items-center gap-2 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-base">calendar_today</span>
              <span>Heute: {status.todayHours}</span>
            </div>

            {/* Amenities grid */}
            {amenities.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {amenities.map(a => (
                  <div key={a.key} className="flex items-center gap-2.5 px-4 py-3 bg-surface-container-low rounded-xl">
                    <span className="material-symbols-outlined text-primary-container text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>{a.icon}</span>
                    <span className="text-sm font-medium text-on-surface">{a.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Contact info */}
            <div className="space-y-3 pt-2">
              {site.restaurantPhone && (
                <a href={`tel:${site.restaurantPhone}`} className="flex items-center gap-3 text-sm text-on-surface hover:text-primary-container transition-colors">
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">call</span>
                  <span className="font-medium">{site.restaurantPhone}</span>
                </a>
              )}
              {site.restaurantEmail && (
                <a href={`mailto:${site.restaurantEmail}`} className="flex items-center gap-3 text-sm text-on-surface hover:text-primary-container transition-colors">
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">mail</span>
                  <span className="font-medium">{site.restaurantEmail}</span>
                </a>
              )}
              {site.restaurantWebsite && (
                <a href={site.restaurantWebsite} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-primary-container hover:underline transition-colors">
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">language</span>
                  <span className="font-medium">{site.restaurantWebsite}</span>
                </a>
              )}
              {site.restaurantInstagram && (
                <a href={`https://instagram.com/${site.restaurantInstagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-primary-container hover:underline transition-colors">
                  <span className="text-on-surface-variant text-lg font-bold w-6 text-center">@</span>
                  <span className="font-medium">Instagram: @{site.restaurantInstagram}</span>
                </a>
              )}
              {site.restaurantFacebook && (
                <a href={site.restaurantFacebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-primary-container hover:underline transition-colors">
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">thumb_up</span>
                  <span className="font-medium">Facebook</span>
                </a>
              )}
            </div>
          </div>

          {/* Right — Öffnungszeiten card */}
          <div className="bg-surface-container rounded-2xl p-6 h-fit">
            <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">schedule</span>
              Öffnungszeiten
            </h3>
            <div className="space-y-2">
              {[
                { day: 'Montag', hours: 'Ruhetag', closed: true },
                { day: 'Dienstag', hours: '10:00 – 20:00' },
                { day: 'Mittwoch', hours: '10:00 – 20:00' },
                { day: 'Donnerstag', hours: '10:00 – 20:00' },
                { day: 'Freitag', hours: '10:00 – 22:00' },
                { day: 'Samstag', hours: '11:00 – 22:00' },
                { day: 'Sonntag', hours: '11:00 – 19:00' },
              ].map((item) => {
                const now = new Date()
                const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
                const isToday = dayNames[now.getDay()] === item.day
                return (
                  <div
                    key={item.day}
                    className={`flex justify-between items-center px-4 py-2.5 rounded-xl text-sm ${
                      item.closed ? 'bg-red-50 text-red-500'
                        : isToday ? 'bg-primary-container/10 text-on-surface font-semibold ring-1 ring-primary-container/30'
                        : 'bg-surface-container-low'
                    }`}
                  >
                    <span className={`${isToday && !item.closed ? 'font-bold' : 'font-medium'}`}>
                      {item.day}
                      {isToday && <span className="text-[9px] ml-1.5 text-primary-container font-bold uppercase">Heute</span>}
                    </span>
                    <span className={item.closed ? 'font-bold' : 'text-on-surface-variant'}>
                      {item.hours}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Standort */}
      <section className="w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-6 mb-8">
          <h2 className="text-3xl font-bold text-on-surface">So finden Sie uns</h2>
          <p className="text-on-surface-variant mt-2">
            {site.restaurantAddress}
          </p>
        </div>
        <div className="w-full h-[400px] bg-stone-200 relative overflow-hidden">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2629.2!2d9.1744!3d48.7669!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDjCsDQ2JzAxLjAiTiA5wrAxMCczNC4wIkU!5e0!3m2!1sde!2sde!4v1600000000000!5m2!1sde!2sde"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="OMOI Standort"
          />
          {site.restaurantGoogleMaps && (
            <a
              href={site.restaurantGoogleMaps}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <div className="bg-primary-container text-white p-4 rounded-2xl shadow-2xl animate-bounce">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  location_on
                </span>
              </div>
            </a>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-stone-100 border-t border-stone-200 mb-20 md:mb-0">
        <div className="flex flex-col items-center py-12 px-6 gap-6 w-full">
          <img src="/images/omoi-logo.png" alt="OMOI" className="h-8 object-contain opacity-70" />
          <div className="flex flex-wrap justify-center gap-8 md:gap-12">
            <a className="text-stone-500 text-sm hover:underline decoration-amber-500 underline-offset-4" href="/ueber-uns">Über uns</a>
            <a className="text-stone-500 text-sm hover:underline decoration-amber-500 underline-offset-4" href="/datenschutz">Datenschutz</a>
            <a className="text-stone-500 text-sm hover:underline decoration-amber-500 underline-offset-4" href="/kontakt">Kontakt</a>
            <a className="text-stone-500 text-sm hover:underline decoration-amber-500 underline-offset-4" href="/impressum">Impressum</a>
          </div>
          <p className="text-sm text-stone-900 mt-4">© 2025 OMOI • 思い. Feinste Kaffeekultur.</p>
        </div>
      </footer>
    </div>
  )
}
