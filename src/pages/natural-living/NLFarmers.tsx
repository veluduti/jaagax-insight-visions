import NLLayout from "@/features/natural-living/NLLayout";
import { PageHeader, Section, Eyebrow, CTA } from "@/features/natural-living/ui";
import { Link } from "react-router-dom";
import hands from "@/assets/nl-hands.jpg";
import hero from "@/assets/nl-hero.jpg";
import produce from "@/assets/nl-produce.jpg";

const FARMERS = [
  { image: hero, name: "Rajanna", age: 58, village: "Nagamangala, Karnataka", crop: "Red rice, ragi", years: 34, quote: "The seed is not mine. It came from my father, who got it from his." },
  { image: hands, name: "Meenakshi", age: 42, village: "Karur, Tamil Nadu", crop: "Millets, moringa", years: 18, quote: "When my daughters ask why we still farm, I tell them: someone has to remember." },
  { image: produce, name: "Suresh", age: 47, village: "Suntikoppa, Coorg", crop: "Coffee, cardamom", years: 22, quote: "My coffee is grown under trees older than my grandmother." },
  { image: hero, name: "Lakshmamma", age: 63, village: "Chikmagalur", crop: "Organic vegetables", years: 40, quote: "The land teaches you patience. If you don't want it, farm something else." },
  { image: hands, name: "Aravind", age: 34, village: "Wayanad, Kerala", crop: "Spices, honey", years: 12, quote: "I left an IT job for this soil. Best decision of my life." },
  { image: produce, name: "Godavari", age: 51, village: "Sinnar, Maharashtra", crop: "Pomegranate", years: 27, quote: "One fruit takes six months. Six months of my life in every one you eat." },
];

export default function NLFarmers() {
  return (
    <NLLayout>
      <PageHeader
        eyebrow="Our People · Farmers"
        title="Every farm has a name. Every name has a story."
        lede="Meet a few of the farmers who make JAGAA possible. Each of them is KYC-verified, land-record verified, and paid directly by the customer sponsoring their crop."
      />

      <Section>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
          {FARMERS.map((f) => (
            <div key={f.name}>
              <div className="overflow-hidden aspect-[4/5] mb-5">
                <img src={f.image} alt={f.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="nl-eyebrow mb-2">{f.village}</div>
              <div className="flex items-baseline justify-between">
                <h3 className="nl-serif text-2xl">{f.name}, {f.age}</h3>
                <span className="text-xs text-[hsl(var(--nl-muted))]">{f.years} yrs</span>
              </div>
              <div className="text-sm text-[hsl(var(--nl-forest))] mt-1">{f.crop}</div>
              <p className="mt-4 nl-serif italic text-[hsl(var(--nl-ink)/0.8)] leading-snug">"{f.quote}"</p>
              <Link to="/natural-living/farms" className="mt-4 inline-block text-xs uppercase tracking-widest text-[hsl(var(--nl-forest))]">
                Sponsor a plot →
              </Link>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="sage">
        <CTA
          title="Are you a farmer? Come on-board."
          copy="If you farm organically and want direct access to customers — with fair pricing, insurance, and tech support — we want to meet you."
          primary={{ label: "Farmer partnership", to: "/natural-living/partner" }}
        />
      </Section>
    </NLLayout>
  );
}
