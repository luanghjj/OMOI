import Link from 'next/link'

export const metadata = { title: 'Datenschutz – OMOI Café' }

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-[#fdfbf7]">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-600 flex items-center gap-1 mb-10">
          ← Zurück
        </Link>

        <h1 className="text-3xl font-bold text-[#3b1f0a] mb-8">Datenschutzerklärung</h1>

        <div className="space-y-6 text-sm text-stone-600 leading-relaxed">
          <section>
            <h2 className="font-bold text-[#3b1f0a] mb-2">1. Verantwortlicher</h2>
            <p>OMOI Café & Roastery, Hauptstätter Str. 57, 70178 Stuttgart<br />
              E-Mail: hello@omoi.cafe
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[#3b1f0a] mb-2">2. Erhobene Daten</h2>
            <p>Beim Reservieren erfassen wir Name, Telefonnummer und optional E-Mail-Adresse.
              Diese Daten werden ausschließlich zur Verwaltung Ihrer Tischreservierung verwendet.</p>
          </section>

          <section>
            <h2 className="font-bold text-[#3b1f0a] mb-2">3. Speicherdauer</h2>
            <p>Ihre Reservierungsdaten werden nach Ablauf der gesetzlichen Aufbewahrungsfrist
              gelöscht, spätestens jedoch 1 Jahr nach Ihrem Besuch.</p>
          </section>

          <section>
            <h2 className="font-bold text-[#3b1f0a] mb-2">4. Ihre Rechte</h2>
            <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung
              der Verarbeitung Ihrer Daten. Kontaktieren Sie uns unter hello@omoi.cafe.</p>
          </section>

          <section>
            <h2 className="font-bold text-[#3b1f0a] mb-2">5. Cookies</h2>
            <p>Unsere Website verwendet technisch notwendige Cookies (Session-Cookie für
              eingeloggte Nutzer). Es werden keine Tracking- oder Marketing-Cookies eingesetzt.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
