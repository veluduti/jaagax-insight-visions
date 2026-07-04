import NLLayout from "@/features/natural-living/NLLayout";
import { PageHeader, Section, Eyebrow, CTA } from "@/features/natural-living/ui";
import { Sunrise, Flower2, Leaf, Utensils, Trees, Moon } from "lucide-react";
import stay from "@/assets/nl-stay.jpg";
import hero from "@/assets/nl-hero.jpg";

const PROGRAMS = [
  { icon: Sunrise, title: "Sunrise Yoga", copy: "Daily 6:00 am · practiced in the fields · Hatha, Vinyasa or restorative depending on the season." },
  { icon: Flower2, title: "Ayurvedic Retreat", copy: "7-day, 14-day and 21-day programs · consultation, panchakarma, seasonal diet, herbal support." },
  { icon: Leaf, title: "Forest Bathing", copy: "Guided shinrin-yoku walks in the coffee slopes of Coorg and the spice forests of Wayanad." },
  { icon: Utensils, title: "Farm-to-Table Meals", copy: "All meals grown within 5 km · seasonal · Sattvic-Ayurvedic · no refined ingredients." },
  { icon: Trees, title: "Digital Detox Weekends", copy: "48 hours without phones, screens or clocks. Just fields, food, and the slow return of your own attention." },
  { icon: Moon, title: "Meditation & Silence", copy: "Vipassana-style silent retreats hosted by trained facilitators in JAGAA villages." },
];

export default function NLWellness() {
  return (
    <NLLayout>
      <PageHeader
        eyebrow="Living Wellness"
        title="A rhythm your body already knows."
        lede="Wellness on JAGAA isn't a spa. It's a village, a season and a discipline — practiced by hosts who have been doing this for decades, not weeks."
      />

      <Section>
        <div className="grid md:grid-cols-3 gap-10">
          {PROGRAMS.map((p) => (
            <div key={p.title} className="border-t border-[hsl(var(--nl-forest)/0.25)] pt-6">
              <p.icon className="h-6 w-6 mb-4" style={{ color: "hsl(var(--nl-forest))" }} />
              <h3 className="nl-serif text-2xl mb-3">{p.title}</h3>
              <p className="text-[hsl(var(--nl-ink)/0.75)] leading-relaxed text-sm">{p.copy}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="sage">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="overflow-hidden aspect-[4/3]">
            <img src={stay} alt="Farm stay veranda" className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div>
            <Eyebrow>Featured retreat</Eyebrow>
            <h2 className="nl-serif text-4xl md:text-5xl mt-4">A 7-day Ayurvedic reset in Wayanad.</h2>
            <p className="mt-6 text-[hsl(var(--nl-ink)/0.75)] leading-relaxed">
              Dr. Rema Nair guides a group of eight through a week of consultations, panchakarma treatments,
              seasonal Ayurvedic meals and forest walks — in a village that has grown its own herbs for generations.
            </p>
            <div className="mt-6 flex items-baseline gap-4">
              <div className="nl-serif text-3xl" style={{ color: "hsl(var(--nl-forest))" }}>₹48,000</div>
              <div className="text-sm text-[hsl(var(--nl-muted))]">/ person · all inclusive</div>
            </div>
            <a href="/natural-living/contact" className="nl-btn nl-btn-primary mt-8">Enquire about this retreat</a>
          </div>
        </div>
      </Section>

      <Section>
        <CTA
          title="Design a retreat for your group."
          copy="We build custom retreats for corporates, teams, families and small groups (4-20 people)."
          primary={{ label: "Talk to us", to: "/natural-living/contact" }}
          secondary={{ label: "Corporate wellness", to: "/natural-living/corporate" }}
        />
      </Section>
    </NLLayout>
  );
}
