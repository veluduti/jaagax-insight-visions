import NLLayout from "@/features/natural-living/NLLayout";
import { PageHeader, Section, Eyebrow, EditorialCard, CTA } from "@/features/natural-living/ui";
import hero from "@/assets/nl-hero.jpg";
import stay from "@/assets/nl-stay.jpg";
import produce from "@/assets/nl-produce.jpg";
import hands from "@/assets/nl-hands.jpg";

const VILLAGES = [
  { image: hero, eyebrow: "Karnataka", title: "Nagamangala.", excerpt: "148 farmers · red rice, ragi, jaggery. Known for its temple pond and mango orchards." },
  { image: stay, eyebrow: "Karnataka", title: "Suntikoppa, Coorg.", excerpt: "Coffee slopes, homestays under canopies, and the softest monsoons in South India." },
  { image: produce, eyebrow: "Kerala", title: "Meppadi, Wayanad.", excerpt: "Spice farms, tribal weaving traditions, and forest walks that end at waterfalls." },
  { image: hands, eyebrow: "Tamil Nadu", title: "Vellagoundanpatti.", excerpt: "A millet-first village that has revived four heirloom grains in five seasons." },
  { image: hero, eyebrow: "Andhra Pradesh", title: "Araku.", excerpt: "Coffee, honey, and tribal cuisine served on banana leaves under a rain-tree." },
  { image: stay, eyebrow: "Maharashtra", title: "Sinnar.", excerpt: "Organic pomegranates, wind turbines on the horizon, and a lake that turns pink at dawn." },
];

export default function NLVillages() {
  return (
    <NLLayout>
      <PageHeader
        eyebrow="Villages · 148 & counting"
        title="Every village on JAGAA is a story worth arriving into."
        lede="We work with villages that opt in — with their coordinator, their farmers, their cooks and their crafts. Each one gets a page. Each page tells the truth."
      />

      <Section>
        <div className="flex flex-wrap gap-3 mb-14">
          {["All", "Karnataka", "Kerala", "Tamil Nadu", "Andhra Pradesh", "Maharashtra", "Telangana"].map((f, i) => (
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
          {VILLAGES.map((v) => (
            <EditorialCard key={v.title} {...v} to="/natural-living/villages" />
          ))}
        </div>
      </Section>

      <Section tone="sage">
        <CTA
          title="Is your village a JAGAA village?"
          copy="If you're a village coordinator, farmer or land owner, tell us about your place. We visit every village before onboarding."
          primary={{ label: "Nominate a village", to: "/natural-living/partner" }}
        />
      </Section>
    </NLLayout>
  );
}
