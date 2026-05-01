import Link from 'next/link'

export const metadata = { title: 'Über uns – OMOI Café' }

export default function UeberUnsPage() {
  return (
    <div className="min-h-screen bg-[#fdfbf7]">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-600 flex items-center gap-1 mb-10">
          ← Zurück
        </Link>

        <h1 className="text-3xl font-bold text-[#3b1f0a] mb-2">Über uns</h1>
        <p className="text-[#C4975C] font-semibold mb-8">Brunch · Matcha · Onigirazu</p>

        <div className="space-y-5 text-stone-600 leading-relaxed">
          <p>
            <strong className="text-[#3b1f0a]">OMOI</strong> bedeutet auf Japanisch Gefühl,
            Gedanke, Sehnsucht und Liebe – alles zugleich. Genau das steckt in jedem
            Teller und jeder Tasse, die wir servieren.
          </p>
          <p>
            Wir sind ein auf <strong className="text-[#3b1f0a]">Matcha spezialisiertes Café</strong> mit
            Brunch- und Onigirazu-Küche im Herzen von Stuttgart. Unser Ceremonial-Grade-Matcha
            kommt direkt aus Japan – ob als klassischer Matcha HOT, cremiger Velvet Matcha
            mit Tiramisu oder erfrischender Yuzu Matcha Cloud.
          </p>
          <p>
            Unsere <strong className="text-[#3b1f0a]">Signature Onigirazu</strong> – japanische
            Onigiri-Sandwiches aus Nori, Sushireis und frischen Zutaten – sind das Herzstück
            unserer Küche. Von Hot Red Tuna über Teriyaki Dry-Aged Salmon bis zum
            vegetarischen Super Mario.
          </p>
          <p>
            Dazu gibt es Brunch-Klassiker beim <strong className="text-[#3b1f0a]">Early Bird</strong>,
            herzhafte <strong className="text-[#3b1f0a]">Bowls</strong> aus Sushireis, Avocado und Kimchi,
            hausgemachte <strong className="text-[#3b1f0a]">Slow Juices</strong> – und natürlich unser
            legendäres <strong className="text-[#3b1f0a]">Matcha Tiramisu</strong>.
          </p>
          <p>Wir freuen uns auf dich. 🍵</p>
        </div>

        {/* Menu highlights */}
        <div className="mt-10 grid grid-cols-2 gap-3">
          {[
            { emoji: '🍵', title: 'Matcha & Hojicha', desc: 'Ceremonial Grade aus Japan' },
            { emoji: '🔪', title: 'Signature Onigirazu', desc: 'Hot Red Tuna · Salmon · Chicken' },
            { emoji: '🥗', title: 'O·MO·I Bowls', desc: 'Sushireis, Avocado, Kimchi, Nori' },
            { emoji: '🌅', title: 'Early Bird Brunch', desc: 'Täglich 8:00 – 10:30 Uhr' },
            { emoji: '🍋', title: 'Slow-Juice Bar', desc: 'DetoX Green Glow · Yuzu Lemonade' },
            { emoji: '🍰', title: 'Matcha Tiramisu', desc: 'Unser Signature Dessert' },
          ].map(item => (
            <div key={item.title} className="bg-white border border-[#e8dcc8] rounded-2xl p-4 flex gap-3 items-start">
              <span className="text-xl">{item.emoji}</span>
              <div>
                <p className="text-sm font-bold text-[#3b1f0a]">{item.title}</p>
                <p className="text-xs text-stone-400 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 p-5 bg-white rounded-2xl border border-[#e8dcc8] space-y-2 text-sm text-stone-500">
          <p><strong className="text-[#3b1f0a]">Adresse:</strong> Hauptstätter Str. 57, 70178 Stuttgart-Mitte</p>
          <p><strong className="text-[#3b1f0a]">Di–Do:</strong> 10:00 – 20:00 · <strong className="text-[#3b1f0a]">Fr:</strong> 10:00 – 22:00</p>
          <p><strong className="text-[#3b1f0a]">Sa:</strong> 11:00 – 22:00 · <strong className="text-[#3b1f0a]">So:</strong> 11:00 – 19:00</p>
          <p className="text-xs text-stone-400">Montag: Ruhetag · An Feiertagen wie sonntags 11–19 Uhr</p>
          <p><strong className="text-[#3b1f0a]">E-Mail:</strong> hello@o-mo-i.de</p>
          <p><strong className="text-[#3b1f0a]">Instagram:</strong> @omoi.stuttgart</p>
        </div>
      </div>
    </div>
  )
}
