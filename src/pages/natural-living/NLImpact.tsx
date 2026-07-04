import NLLayout from "@/features/natural-living/NLLayout";
import { PageHeader, Section, Eyebrow, H2, CTA } from "@/features/natural-living/ui";

export default function NLImpact() {
  return (
    <NLLayout>
      <PageHeader
        eyebrow="Impact · Season 01"
        title="Every rupee spent on JAGAA is a rupee that stays in a village."
        lede="This is the impact of JAGAA Natural Living, as measured across our first 148 villages. Independently audited. Published every season."
      />

      <Section>
        <div className="grid md:grid-cols-4 gap-8">
          {[
            { n: "₹4.2 Cr", label: "Paid directly to farmers", sub: "Zero middleman deductions" },
            { n: "₹1.1 Cr", label: "Paid to village coordinators", sub: "Ground operations & hospitality" },
            { n: "₹78 L", label: "Paid to artisans & cooks", sub: "Crafts, meals, experiences" },
            { n: "₹32 L", label: "Reinvested in seed banks", sub: "Heirloom preservation" },
          ].map((s) => (
            <div key={s.label} className="border-t border-[hsl(var(--nl-forest)/0.3)] pt-5">
              <div className="nl-serif text-4xl md:text-5xl" style={{ color: "hsl(var(--nl-forest))" }}>{s.n}</div>
              <div className="mt-3 text-sm font-medium">{s.label}</div>
              <div className="text-xs text-[hsl(var(--nl-muted))] mt-1">{s.sub}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="sage">
        <Eyebrow>Shared value</Eyebrow>
        <H2 className="mt-4 max-w-3xl">Where every ₹100 you spend on JAGAA actually goes.</H2>

        <div className="mt-14 max-w-3xl">
          {[
            { pct: 72, label: "Farmer or host earnings", note: "Direct to the person who grew, cooked or hosted" },
            { pct: 12, label: "Village coordinator + logistics", note: "Local hospitality, transport, coordination" },
            { pct: 8, label: "Sustainability reinvestment", note: "Trees, seed banks, water systems" },
            { pct: 5, label: "Platform operations", note: "Engineering, QA, verification, insurance" },
            { pct: 3, label: "Taxes & compliance", note: "Statutory contributions" },
          ].map((row) => (
            <div key={row.label} className="py-5 border-t border-[hsl(var(--nl-forest)/0.3)]">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <div className="text-sm font-medium">{row.label}</div>
                  <div className="text-xs text-[hsl(var(--nl-muted))] mt-1">{row.note}</div>
                </div>
                <div className="nl-serif text-2xl" style={{ color: "hsl(var(--nl-forest))" }}>
                  {row.pct}%
                </div>
              </div>
              <div className="h-1 w-full" style={{ background: "hsl(var(--nl-cream))" }}>
                <div
                  className="h-1 transition-all"
                  style={{ width: `${row.pct}%`, background: "hsl(var(--nl-forest))" }}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <CTA
          title="Fund a village season."
          copy="Corporates, families and foundations can sponsor an entire village's crop cycle — with a named report at the end of it."
          primary={{ label: "Corporate impact programs", to: "/natural-living/corporate" }}
          secondary={{ label: "Read the sustainability page", to: "/natural-living/sustainability" }}
        />
      </Section>
    </NLLayout>
  );
}
