import NLLayout from "@/features/natural-living/NLLayout";
import { PageHeader, Section, Eyebrow, H2, CTA } from "@/features/natural-living/ui";
import { Sprout, Droplets, Recycle, TreePine, Sun, Wheat } from "lucide-react";

const PRACTICES = [
  { icon: Sprout, title: "100% organic-only farms", copy: "No chemical fertilizers, no synthetic pesticides. Certified before onboarding." },
  { icon: Droplets, title: "Rain-fed & drip irrigation", copy: "We prioritise farms that harvest water and irrigate with drip systems." },
  { icon: Recycle, title: "Zero-plastic packaging", copy: "Produce ships in jute, palm-leaf and returnable steel — never single-use plastic." },
  { icon: TreePine, title: "One acre = 20 trees", copy: "Every partner farm plants and protects 20 native trees per acre." },
  { icon: Sun, title: "Solar-first stays", copy: "Every JAGAA farm stay runs primarily on solar. Grid-tied only as backup." },
  { icon: Wheat, title: "Heirloom seed banks", copy: "We fund village-level seed banks preserving native rice, millet and vegetable varieties." },
];

export default function NLSustainability() {
  return (
    <NLLayout>
      <PageHeader
        eyebrow="Sustainability"
        title="If we can't measure it, we don't claim it."
        lede="Every JAGAA promise — organic, fair, low-carbon, low-plastic — is backed by an auditable practice, a village-level report, and an annual third-party audit."
      />

      <Section>
        <div className="grid md:grid-cols-3 gap-10">
          {PRACTICES.map((p) => (
            <div key={p.title} className="border-t border-[hsl(var(--nl-forest)/0.25)] pt-6">
              <p.icon className="h-6 w-6 mb-4" style={{ color: "hsl(var(--nl-forest))" }} />
              <h3 className="nl-serif text-2xl mb-3">{p.title}</h3>
              <p className="text-[hsl(var(--nl-ink)/0.75)] leading-relaxed text-sm">{p.copy}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="ink">
        <Eyebrow><span style={{ color: "hsl(var(--nl-cream) / 0.8)" }}>Impact ledger · 2026</span></Eyebrow>
        <H2 className="mt-4 max-w-3xl" >
          <span style={{ color: "hsl(var(--nl-cream))" }}>
            Every number below is traceable to a village and a season.
          </span>
        </H2>
        <div className="grid md:grid-cols-4 gap-10 mt-14">
          {[
            { n: "42,000", label: "Trees planted" },
            { n: "18M L", label: "Water saved" },
            { n: "62,000 kg", label: "Plastic avoided" },
            { n: "2.4M kg", label: "Carbon offset" },
          ].map((s) => (
            <div key={s.label} className="border-t border-[hsl(var(--nl-cream)/0.25)] pt-5">
              <div className="nl-serif text-5xl" style={{ color: "hsl(var(--nl-sage))" }}>{s.n}</div>
              <div className="mt-2 text-sm" style={{ color: "hsl(var(--nl-cream))" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <CTA
          title="Read our full sustainability report."
          copy="Annual, village-by-village, third-party audited. Published every March."
          primary={{ label: "See the impact page", to: "/natural-living/impact" }}
          secondary={{ label: "Corporate offset programs", to: "/natural-living/corporate" }}
        />
      </Section>
    </NLLayout>
  );
}
