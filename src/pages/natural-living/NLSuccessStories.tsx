import NLLayout from "@/features/natural-living/NLLayout";
import { PageHeader, Section, Eyebrow, CTA } from "@/features/natural-living/ui";
import hero from "@/assets/nl-hero.jpg";
import produce from "@/assets/nl-produce.jpg";

const STORIES = [
  { name: "Rajanna, 58 — Farmer", place: "Nagamangala, Karnataka", quote: "Twelve years I sold my rice through a middleman for ₹22 a kg. Today JAGAA customers pay me ₹68, and I know their names.", stat: "Income +3.1×", tag: "Farmer" },
  { name: "Lakshmi Devi — Land Owner", place: "Chikmagalur, Karnataka", quote: "My 12 acres were a burden. Now three farmers work it, I get a monthly cheque, and the estate is greener than it was in my father's time.", stat: "Idle land → ₹1.8L/mo", tag: "Land Owner" },
  { name: "Godrej Consumer — CSR", place: "Wayanad, Kerala", quote: "We adopted one village for a year. 22,000 trees planted. Our sustainability report finally has numbers I trust.", stat: "22,000 trees · 1 village", tag: "Corporate" },
  { name: "Vidya Mandir School", place: "Bengaluru", quote: "Our 6th graders spent three days in a JAGAA village. They came back changed — quieter, curious, and cooking with their grandmothers.", stat: "180 students · 3 days", tag: "School" },
  { name: "The Menon Family", place: "Kochi", quote: "One farm stay turned into a subscription, and now our kids can name three farmers. That feels important.", stat: "12-month subscriber", tag: "Family" },
  { name: "Dr. Rema Nair — Expert", place: "Kannur, Kerala", quote: "I came back from Dubai to consult on Ayurveda meals in JAGAA retreats. I'll never leave again.", stat: "48 retreats hosted", tag: "Expert" },
];

export default function NLSuccessStories() {
  return (
    <NLLayout>
      <PageHeader
        eyebrow="Success Stories"
        title="What JAGAA looks like from the ground."
        lede="Six people, six villages, six ways this platform has changed a life. Names, places and numbers are real."
      />

      <Section>
        <div className="grid md:grid-cols-2 gap-10">
          {STORIES.map((s) => (
            <div key={s.name} className="border-t border-[hsl(var(--nl-forest)/0.3)] pt-8">
              <div className="nl-eyebrow mb-3">{s.tag}</div>
              <p className="nl-serif text-2xl leading-snug mb-5">"{s.quote}"</p>
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-xs text-[hsl(var(--nl-muted))] mt-1">{s.place}</div>
                </div>
                <div className="nl-serif text-lg" style={{ color: "hsl(var(--nl-forest))" }}>{s.stat}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="sage">
        <CTA
          title="Write the next story."
          copy="A farm, a village, a company, or a family — the next story starts with one call to our team."
          primary={{ label: "Partner with JAGAA", to: "/natural-living/partner" }}
          secondary={{ label: "See impact numbers", to: "/natural-living/impact" }}
        />
      </Section>
    </NLLayout>
  );
}
