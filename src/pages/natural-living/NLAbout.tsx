import NLLayout from "@/features/natural-living/NLLayout";
import { PageHeader, Section, H2, Eyebrow, CTA } from "@/features/natural-living/ui";
import hands from "@/assets/nl-hands.jpg";

export default function NLAbout() {
  return (
    <NLLayout>
      <PageHeader
        eyebrow="About"
        title="We started with one field. We are building a republic of a thousand villages."
        lede="JAGAA Natural Living is the sister platform of JAAGA X — India's trust-first real-estate network — extended into rural land, farms, and living."
      />

      <Section>
        <div className="grid md:grid-cols-12 gap-16 items-start">
          <div className="md:col-span-7 space-y-6 text-[hsl(var(--nl-ink)/0.8)] leading-relaxed">
            <p className="nl-serif text-2xl md:text-3xl" style={{ color: "hsl(var(--nl-ink))" }}>
              Two farmers, one field, one Saturday afternoon.
            </p>
            <p>
              JAGAA began the way most honest things do — with a conversation. Two farmers outside a
              small Karnataka village were talking about why the middleman kept taking 40% of their
              rice, why their children were leaving for Bengaluru, and why a family in the city was
              paying six times what they were being paid.
            </p>
            <p>
              We asked what would change if the family in the city could talk directly to the farmer,
              see the field, sponsor the crop, and receive the rice with the farmer's name on it.
              That question grew into JAGAA Natural Living.
            </p>
            <p>
              Today JAGAA is a team of engineers, agronomists, chefs, hospitality operators, and
              village coordinators building software and infrastructure so that farmers, land owners,
              customers, corporates and schools can all meet on one level, honest platform.
            </p>
            <p>
              We are backed by JAAGA X, an Indian real-estate network known for its trust-first
              verification model. That same DNA — audit-before-you-advertise — is what shapes every
              corner of JAGAA.
            </p>
          </div>
          <div className="md:col-span-5">
            <div className="overflow-hidden aspect-[4/5]">
              <img src={hands} alt="Farmer with paddy seedlings" className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="mt-6 nl-eyebrow">Founding image · Karnataka, 2026</div>
          </div>
        </div>
      </Section>

      <Section tone="sage">
        <Eyebrow>The team you'll actually meet</Eyebrow>
        <H2 className="mt-4 max-w-3xl">A small central team, and a large village-embedded one.</H2>
        <div className="grid md:grid-cols-3 gap-10 mt-14">
          {[
            { role: "Central Team", n: "24", label: "engineers, agronomists, chefs, ops" },
            { role: "Village Coordinators", n: "148", label: "on-the-ground, one per village" },
            { role: "Verified Experts", n: "60+", label: "organic, Ayurveda, wellness, legal" },
          ].map((t) => (
            <div key={t.role} className="border-t border-[hsl(var(--nl-forest)/0.3)] pt-5">
              <div className="nl-eyebrow">{t.role}</div>
              <div className="nl-serif text-6xl mt-4" style={{ color: "hsl(var(--nl-forest))" }}>{t.n}</div>
              <div className="mt-3 text-[hsl(var(--nl-ink)/0.75)] text-sm">{t.label}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <CTA
          title="Come build this with us."
          copy="Whether you're a farmer, land owner, corporate, school or curious traveller — we want to hear from you."
          primary={{ label: "Contact us", to: "/natural-living/contact" }}
          secondary={{ label: "Partner with JAGAA", to: "/natural-living/partner" }}
        />
      </Section>
    </NLLayout>
  );
}
