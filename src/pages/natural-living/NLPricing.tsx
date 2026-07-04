import NLLayout from "@/features/natural-living/NLLayout";
import { PageHeader, Section, Eyebrow, CTA } from "@/features/natural-living/ui";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const TIERS = [
  {
    name: "Seedling",
    price: "₹1,499",
    unit: "/ month",
    tagline: "One plot. One farmer. One monthly box.",
    features: [
      "Sponsor 1 plot (up to 0.1 acre)",
      "Weekly photo & video updates",
      "Monthly organic produce box (5-7 kg)",
      "Community access",
      "Farm visit — 1 per year",
    ],
    cta: "Start with Seedling",
    highlight: false,
  },
  {
    name: "Grove",
    price: "₹3,999",
    unit: "/ month",
    tagline: "A family's box. A farmer's stability.",
    features: [
      "Sponsor 3 plots across villages",
      "Weekly farmer video calls",
      "Weekly produce box (12-15 kg)",
      "2 farm stay nights included / year",
      "Priority community access",
      "Farm visits — 3 per year",
    ],
    cta: "Choose Grove",
    highlight: true,
  },
  {
    name: "Forest",
    price: "Custom",
    unit: "",
    tagline: "For companies, schools and large families.",
    features: [
      "Adopt an entire village season",
      "Custom crop portfolio",
      "Weekly impact dashboard",
      "Employee/student farm days",
      "Carbon offset & tree plantation report",
      "Dedicated JAGAA coordinator",
    ],
    cta: "Talk to our team",
    highlight: false,
  },
];

export default function NLPricing() {
  return (
    <NLLayout>
      <PageHeader
        eyebrow="Pricing"
        title="Subscribe to a farmer, not a plan."
        lede="Our pricing is deliberately simple — three tiers, each one designed around how much of a farmer's season you'd like to sponsor."
      />

      <Section>
        <div className="grid md:grid-cols-3 gap-8">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`p-8 md:p-10 border transition-all ${
                t.highlight
                  ? "border-[hsl(var(--nl-forest))] bg-[hsl(var(--nl-cream-deep))]"
                  : "border-[hsl(var(--border))] bg-[hsl(var(--card))]"
              }`}
            >
              {t.highlight && <div className="nl-eyebrow mb-4">Most chosen</div>}
              <div className="nl-serif text-3xl mb-1" style={{ color: "hsl(var(--nl-forest))" }}>{t.name}</div>
              <div className="text-sm text-[hsl(var(--nl-ink)/0.7)] mb-6">{t.tagline}</div>

              <div className="flex items-baseline gap-1 mb-8">
                <span className="nl-serif text-5xl">{t.price}</span>
                <span className="text-sm text-[hsl(var(--nl-muted))]">{t.unit}</span>
              </div>

              <ul className="space-y-3 mb-10 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "hsl(var(--nl-forest))" }} />
                    <span className="text-[hsl(var(--nl-ink)/0.8)]">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={t.name === "Forest" ? "/natural-living/contact" : "/natural-living/farms"}
                className={`nl-btn w-full justify-center ${t.highlight ? "nl-btn-primary" : "nl-btn-outline"}`}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-16 text-xs text-[hsl(var(--nl-muted))] max-w-2xl">
          All prices in INR, inclusive of taxes. Cancel anytime. Prices shown are for reference — final pricing depends on the farmer, plot, crop and village you choose.
        </div>
      </Section>

      <Section tone="sage">
        <CTA
          title="Not ready to subscribe?"
          copy="Book a single farm stay or a one-time produce box first — no subscription required."
          primary={{ label: "Book a farm stay", to: "/natural-living/farm-stay" }}
          secondary={{ label: "Read FAQs", to: "/natural-living/faq" }}
        />
      </Section>
    </NLLayout>
  );
}
