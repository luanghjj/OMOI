import Link from 'next/link'

export const metadata = { title: 'Impressum – OMOI Café' }

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-[#fdfbf7]">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-600 flex items-center gap-1 mb-10">
          ← Zurück
        </Link>

        <h1 className="text-3xl font-bold text-[#3b1f0a] mb-8">Impressum</h1>

        <div className="space-y-6 text-sm text-stone-600">
          <section>
            <h2 className="font-bold text-[#3b1f0a] mb-2">Angaben gemäß § 5 TMG</h2>
            <p>OMOI Café & Roastery<br />
              Hauptstätter Str. 57<br />
              70178 Stuttgart<br />
              Deutschland
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[#3b1f0a] mb-2">Kontakt</h2>
            <p>Telefon: +49 711 000 0000<br />
              E-Mail: hello@omoi.cafe
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[#3b1f0a] mb-2">Verantwortlich für den Inhalt</h2>
            <p>OMOI Café & Roastery<br />
              Hauptstätter Str. 57<br />
              70178 Stuttgart
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[#3b1f0a] mb-2">Haftungsausschluss</h2>
            <p>Die Inhalte dieser Website wurden mit größter Sorgfalt erstellt. Für die
              Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine
              Gewähr übernehmen.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
