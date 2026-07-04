import NLLayout from "@/features/natural-living/NLLayout";
import { PageHeader, Section, H2, Eyebrow, CTA } from "@/features/natural-living/ui";
import { Sprout, HandHeart, Route, ShieldCheck, Users2, Trees } from "lucide-react";

const REASONS = [
  {
    icon: HandHeart,
    title: "Farmer-first economics",
    copy: "Farmers keep 70%+ of every rupee. Land owners get transparent revenue. No opaque grading, no last-mile squeeze.",
  },
  {
    icon: Route,
    title: "Full traceability, always",
    copy: "Every crop, every meal, every stay is traceable to a specific plot, farmer and village — with dates, photos and payments on record.",
  },
  {
    icon: ShieldCheck,
    title: "Verified, not vibes",
    copy: "Organic certification, KYC-verified farmers, insurance-backed stays, and admin-approved villages. We audit before we advertise.",
  },
  {
    icon: Users2,
    title: "Community-owned",
    copy: "Village coordinators run the ground game. Local experts, artisans, cooks and guides earn on the platform, not off it.",
  },
  {
    icon: Sprout,
    title: "One ecosystem, thirteen actors",
    copy: "Farmers, customers, land owners, experts, delivery partners, wellness hosts, guides, schools, corporates — one shared system.",
  },
  {
    icon: Trees,
    title: "Sustainability with numbers",
    copy: "Trees planted, water saved, plastic avoided, carbon offset — measured per village, published per season, audited annually.",
  },
];

export default function NLWhy() {
  return (
    <NLLayout>
      <PageHeader
        eyebrow="Why JAGAA"
        title="Not another marketplace. A shared republic of the land."
        lede="Six things that make JAGAA Natural Living different from every organic app, farm-to-fork startup and eco-tourism aggregator you have used before."
      />

      <Section>
        <div className="grid md:grid-cols-2 gap-x-16 gap-y-14">
          {REASONS.map((r, i) => (
            <div key={r.title} className="grid grid-cols-[auto_1fr] gap-6 border-t border-[hsl(var(--nl-forest)/0.25)] pt-8">
              <div className="nl-serif text-3xl w-12" style={{ color: "hsl(var(--nl-forest))" }}>
                0{i + 1}
              </div>
              <div>
                <r.icon className="h-5 w-5 mb-3" style={{ color: "hsl(var(--nl-forest))" }} />
                <h3 className="nl-serif text-2xl mb-3">{r.title}</h3>
                <p className="text-[hsl(var(--nl-ink)/0.75)] leading-relaxed">{r.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="sage">
        <CTA
          title="Stop shopping. Start belonging."
          copy="JAGAA is not something you check out from. It is something you become part of — one plot, one visit, one season at a time."
          primary={{ label: "Explore farms", to: "/natural-living/farms" }}
          secondary={{ label: "Read our vision", to: "/natural-living/vision" }}
        />
      </Section>
    </NLLayout>
  );
}
