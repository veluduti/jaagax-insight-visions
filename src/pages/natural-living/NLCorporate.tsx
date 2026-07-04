import NLLayout from "@/features/natural-living/NLLayout";
import { PageHeader, Section, Eyebrow, H2, CTA } from "@/features/natural-living/ui";
import { Users2, Trees, LineChart, Package, ClipboardCheck } from "lucide-react";

const PROGRAMS = [
  { icon: Users2, title: "Village Adoption", copy: "Sponsor an entire village for a season. Your logo on the seed bank, your name on the harvest, your report signed by a village coordinator." },
  { icon: Trees, title: "Carbon Offset & Trees", copy: "1 acre planted with 400 native trees. Geo-tagged, satellite-verified, third-party audited. Certificates you can defend." },
  { icon: Package, title: "Organic Office Pantry", copy: "Weekly delivery of organic snacks, fruits and grains from JAGAA villages — with traceability cards in every box." },
  { icon: LineChart, title: "Employee Farm Days", copy: "Take your team into a village for a day, a weekend, or a full offsite. We handle transport, hospitality and programming." },
  { icon: ClipboardCheck, title: "CSR Reporting", copy: "Audit-grade impact reports: trees planted, farmers supported, water saved, carbon offset — with names, coordinates and photos." },
];

export default function NLCorporate() {
  return (
    <NLLayout>
      <PageHeader
        eyebrow="For Corporates"
        title="CSR that shows up in a village, not just in a slide."
        lede="JAGAA works with Indian and global corporates on farm adoption, tree plantations, employee retreats, and organic office programs — all with village-level, third-party-auditable impact."
      />

      <Section>
        <div className="grid md:grid-cols-2 gap-10">
          {PROGRAMS.map((p) => (
            <div key={p.title} className="border-t border-[hsl(var(--nl-forest)/0.25)] pt-6 flex gap-6">
              <p.icon className="h-6 w-6 shrink-0 mt-1" style={{ color: "hsl(var(--nl-forest))" }} />
              <div>
                <h3 className="nl-serif text-2xl mb-2">{p.title}</h3>
                <p className="text-[hsl(var(--nl-ink)/0.75)] leading-relaxed text-sm">{p.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="ink">
        <Eyebrow><span style={{ color: "hsl(var(--nl-cream)/0.8)" }}>Trusted by</span></Eyebrow>
        <H2 className="mt-4 max-w-3xl"><span style={{ color: "hsl(var(--nl-cream))" }}>28 companies. 42 villages. One shared measure of impact.</span></H2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mt-14 items-center opacity-80">
          {["ACME", "TATA", "INFOSYS", "GODREJ", "ITC", "MAHINDRA"].map((n) => (
            <div key={n} className="nl-serif text-2xl tracking-widest text-center" style={{ color: "hsl(var(--nl-cream)/0.8)" }}>
              {n}
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <CTA
          title="Let's design a program for your company."
          copy="Our CSR team responds within a day with a scoped proposal, timeline and cost."
          primary={{ label: "Talk to CSR team", to: "/natural-living/contact" }}
          secondary={{ label: "See sustainability", to: "/natural-living/sustainability" }}
        />
      </Section>
    </NLLayout>
  );
}
