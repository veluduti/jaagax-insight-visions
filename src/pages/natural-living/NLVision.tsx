import NLLayout from "@/features/natural-living/NLLayout";
import { PageHeader, Section, H2, Eyebrow, CTA, StatBlock } from "@/features/natural-living/ui";
import hero from "@/assets/nl-hero.jpg";
import hands from "@/assets/nl-hands.jpg";

export default function NLVision() {
  return (
    <NLLayout>
      <PageHeader
        eyebrow="Volume 01 · Vision"
        title="We are building a slower India — one village, one farm, one meal at a time."
        lede="JAGAA Natural Living is a decade-long project to reweave the connection between land, food and family. This is what we believe, and why."
        image={hero}
      />

      <Section>
        <div className="grid md:grid-cols-12 gap-12">
          <div className="md:col-span-4">
            <Eyebrow>Our Beliefs</Eyebrow>
          </div>
          <div className="md:col-span-8 space-y-10">
            {[
              {
                n: "01",
                title: "The land remembers.",
                copy: "Soil is not a substrate; it is a living archive. A field that has been chemically farmed for thirty years cannot be healed in a season, and a field that has been loved for a century cannot be replaced by a warehouse.",
              },
              {
                n: "02",
                title: "The farmer is the first citizen.",
                copy: "No modern food system works if the farmer is broken. JAGAA is built farmer-first: named, paid fairly, in direct contact with the person eating what they grow.",
              },
              {
                n: "03",
                title: "The village is the unit.",
                copy: "Not the field, not the crop, not the customer — the village. When one village thrives, its farmers, artisans, cooks and children thrive with it. We work at that scale.",
              },
              {
                n: "04",
                title: "Slowness is a feature, not a bug.",
                copy: "The convenience economy has taken enough from us. We build for people willing to wait a week for real rice, drive four hours for a real meal, and spend three days in a real village.",
              },
              {
                n: "05",
                title: "Impact must be provable.",
                copy: "Every claim on JAGAA — organic, fair, sustainable — is traceable to a plot, a person and a payment. If we can't prove it, we won't print it.",
              },
            ].map((b) => (
              <div key={b.n} className="grid grid-cols-[auto_1fr] gap-6 border-t border-[hsl(var(--nl-forest)/0.25)] pt-8">
                <div className="nl-serif text-4xl" style={{ color: "hsl(var(--nl-forest))" }}>
                  {b.n}
                </div>
                <div>
                  <h3 className="nl-serif text-2xl md:text-3xl mb-3">{b.title}</h3>
                  <p className="text-[hsl(var(--nl-ink)/0.75)] leading-relaxed">{b.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section tone="deep">
        <div className="max-w-3xl">
          <Eyebrow>
            <span style={{ color: "hsl(var(--nl-cream) / 0.8)" }}>Where we're going</span>
          </Eyebrow>
          <h2 className="nl-serif text-3xl md:text-5xl mt-4" style={{ color: "hsl(var(--nl-cream))" }}>
            By 2035, 1,000 villages. 10,000 farmers. A million meals a month with a name attached to them.
          </h2>
          <p className="mt-8 leading-relaxed" style={{ color: "hsl(var(--nl-cream) / 0.8)" }}>
            That is the number we are working toward. Not scale for scale's sake — but scale enough
            that rural India has a working, dignified alternative to migration and monoculture.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-10 mt-16">
          {[
            { n: "1,000", label: "Villages by 2035" },
            { n: "10,000", label: "Farmers with direct access" },
            { n: "12M kg", label: "Annual carbon offset target" },
          ].map((s) => (
            <div key={s.label} className="border-t border-[hsl(var(--nl-cream)/0.25)] pt-5">
              <div className="nl-serif text-5xl" style={{ color: "hsl(var(--nl-sage))" }}>
                {s.n}
              </div>
              <div className="mt-2 text-sm" style={{ color: "hsl(var(--nl-cream))" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <CTA
          title="If this vision moved you, come stand with us."
          copy="Whether you cook for one, run a company of a thousand, or steward a piece of land — there is a role for you in this."
          primary={{ label: "Partner with us", to: "/natural-living/partner" }}
          secondary={{ label: "Read our impact", to: "/natural-living/impact" }}
        />
      </Section>
    </NLLayout>
  );
}
