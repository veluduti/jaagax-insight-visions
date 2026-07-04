import NLLayout from "@/features/natural-living/NLLayout";
import { PageHeader, Section, Eyebrow, EditorialCard, CTA } from "@/features/natural-living/ui";
import hero from "@/assets/nl-hero.jpg";
import hands from "@/assets/nl-hands.jpg";
import produce from "@/assets/nl-produce.jpg";
import stay from "@/assets/nl-stay.jpg";

const FARMS = [
  { image: hero, eyebrow: "Karnataka · Paddy", title: "Rajanna's Fields.", excerpt: "4 acres · heirloom red rice, ragi, moong. 12-year farmer, 3rd generation." },
  { image: hands, eyebrow: "Kerala · Spice", title: "Wayanad Spice Grove.", excerpt: "8 acres · black pepper, cardamom, turmeric. Tribal-owned collective." },
  { image: produce, eyebrow: "Tamil Nadu · Millet", title: "Meenakshi Millets.", excerpt: "3 acres · foxtail, little, kodo millets. Rain-fed, seed-bank participant." },
  { image: stay, eyebrow: "Coorg · Coffee", title: "Suntikoppa Estate.", excerpt: "12 acres · shade-grown arabica, cardamom intercrop. Bird-friendly certified." },
  { image: hero, eyebrow: "Maharashtra · Fruit", title: "Sinnar Pomegranate Farm.", excerpt: "6 acres · organic pomegranates, drip-irrigated, solar-powered." },
  { image: hands, eyebrow: "Andhra · Coffee", title: "Araku Tribal Coffee.", excerpt: "5 acres · shade coffee, honey, black pepper. Adivasi cooperative." },
];

export default function NLFarms() {
  return (
    <NLLayout>
      <PageHeader
        eyebrow="Farms · Digital Farm"
        title="Choose your farm. Choose your farmer."
        lede="Every JAGAA farm is stewarded by a named farmer, tied to a specific plot, and open to sponsorship. Sponsor a plot, choose a crop, and follow it from soil to your kitchen."
      />

      <Section>
        <div className="grid md:grid-cols-4 gap-6 mb-14">
          {[
            { label: "Verified farms", n: "1,240" },
            { label: "Crops available", n: "84" },
            { label: "States", n: "6" },
            { label: "Avg. farmer earnings ↑", n: "3.1×" },
          ].map((s) => (
            <div key={s.label} className="border-t border-[hsl(var(--nl-forest)/0.3)] pt-4">
              <div className="nl-serif text-4xl" style={{ color: "hsl(var(--nl-forest))" }}>{s.n}</div>
              <div className="mt-2 text-sm text-[hsl(var(--nl-ink)/0.7)]">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-x-10 gap-y-16">
          {FARMS.map((f) => (
            <EditorialCard key={f.title} {...f} to="/natural-living/farms" />
          ))}
        </div>
      </Section>

      <Section tone="sage">
        <CTA
          title="Start your Digital Farm."
          copy="Choose a state → district → village → farmer → plot → crop → subscription. Your farmer sends you weekly updates."
          primary={{ label: "See subscription tiers", to: "/natural-living/pricing" }}
          secondary={{ label: "Meet the farmers", to: "/natural-living/farmers" }}
        />
      </Section>
    </NLLayout>
  );
}
