import NLLayout from "@/features/natural-living/NLLayout";
import { PageHeader, Section, Eyebrow, EditorialCard, CTA } from "@/features/natural-living/ui";
import stay from "@/assets/nl-stay.jpg";
import hero from "@/assets/nl-hero.jpg";
import produce from "@/assets/nl-produce.jpg";
import hands from "@/assets/nl-hands.jpg";

const STAYS = [
  { image: stay, eyebrow: "Village Home · Coorg", title: "The Coffee Cottage.", excerpt: "2 rooms · mud-plaster walls · terracotta roof · organic breakfast · from ₹3,800/night." },
  { image: hero, eyebrow: "Eco Luxury · Wayanad", title: "Canopy House.", excerpt: "Private villa · plunge pool · forest deck · Ayurvedic kitchen · from ₹9,200/night." },
  { image: produce, eyebrow: "Camping · Sinnar", title: "Pomegranate Fields Camp.", excerpt: "Bell tents · shared bathrooms · farm dinner · bonfire · from ₹2,400/night." },
  { image: hands, eyebrow: "Tree House · Chikmagalur", title: "The Rain-Tree Perch.", excerpt: "1 tree house · king bed · balcony over paddy · from ₹6,500/night." },
  { image: stay, eyebrow: "Village Home · Wayanad", title: "The Spice Farmhouse.", excerpt: "3 rooms · veranda · cardamom-scented gardens · from ₹4,200/night." },
  { image: hero, eyebrow: "Glamping · Araku", title: "The Coffee Basecamp.", excerpt: "Safari tents · en-suite bath · tribal cuisine · from ₹5,600/night." },
];

export default function NLFarmStay() {
  return (
    <NLLayout>
      <PageHeader
        eyebrow="Farm Stays"
        title="Sleep where the food is grown."
        lede="Village homes, eco-luxury villas, tree houses, glamping and campsites — every JAGAA stay is hosted by a farmer or a local family, and comes with organic meals from the surrounding land."
      />

      <Section>
        <div className="flex flex-wrap gap-3 mb-14">
          {["All", "Village Home", "Eco Luxury", "Tree House", "Glamping", "Camping"].map((f, i) => (
            <button
              key={f}
              className={`px-4 py-2 text-xs uppercase tracking-widest border transition-all ${
                i === 0
                  ? "bg-[hsl(var(--nl-forest))] text-[hsl(var(--nl-cream))] border-[hsl(var(--nl-forest))]"
                  : "border-[hsl(var(--nl-forest)/0.35)] text-[hsl(var(--nl-forest))] hover:bg-[hsl(var(--nl-forest))] hover:text-[hsl(var(--nl-cream))]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-x-10 gap-y-16">
          {STAYS.map((s) => (
            <EditorialCard key={s.title} {...s} to="/natural-living/farm-stay" />
          ))}
        </div>
      </Section>

      <Section tone="sage">
        <CTA
          title="Every JAGAA stay includes:"
          copy="Clean bedding · hot water · private bathroom · safe drinking water · organic meals · insurance cover · a local coordinator on WhatsApp."
          primary={{ label: "Talk to a coordinator", to: "/natural-living/contact" }}
          secondary={{ label: "See wellness retreats", to: "/natural-living/wellness" }}
        />
      </Section>
    </NLLayout>
  );
}
