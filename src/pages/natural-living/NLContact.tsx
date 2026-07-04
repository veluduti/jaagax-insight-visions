import NLLayout from "@/features/natural-living/NLLayout";
import { PageHeader, Section, Eyebrow, H2, CTA } from "@/features/natural-living/ui";
import { Mail, Phone, MapPin } from "lucide-react";

export default function NLContact() {
  return (
    <NLLayout>
      <PageHeader
        eyebrow="Contact"
        title="Come sit under the neem tree with us."
        lede="Our team responds within one business day. For urgent farm-stay or subscription queries, use WhatsApp."
      />

      <Section>
        <div className="grid md:grid-cols-3 gap-10">
          {[
            { icon: Mail, label: "Email", value: "hello@jagaa.natural", href: "mailto:hello@jagaa.natural" },
            { icon: Phone, label: "WhatsApp", value: "+91 90000 00000", href: "https://wa.me/919000000000" },
            { icon: MapPin, label: "Office", value: "JAGAA Farm Studio, Bengaluru, India" },
          ].map((c) => (
            <a
              key={c.label}
              href={c.href}
              className="block border-t border-[hsl(var(--nl-forest)/0.3)] pt-6 group"
            >
              <c.icon className="h-5 w-5 mb-3" style={{ color: "hsl(var(--nl-forest))" }} />
              <div className="nl-eyebrow mb-2">{c.label}</div>
              <div className="nl-serif text-2xl group-hover:text-[hsl(var(--nl-forest))] transition-colors">{c.value}</div>
            </a>
          ))}
        </div>
      </Section>

      <Section tone="sage">
        <Eyebrow>Departments</Eyebrow>
        <H2 className="mt-4 max-w-2xl">Speak to the right team.</H2>
        <div className="grid md:grid-cols-2 gap-8 mt-10">
          {[
            { t: "Farmers & Land Owners", e: "farms@jagaa.natural", d: "Onboarding, contracts, farm operations." },
            { t: "Customers & Subscriptions", e: "care@jagaa.natural", d: "Deliveries, digital farm, refunds." },
            { t: "Farm Stays & Wellness", e: "stays@jagaa.natural", d: "Bookings, retreats, corporate offsites." },
            { t: "Corporate & Schools", e: "csr@jagaa.natural", d: "CSR, village adoption, curriculum programs." },
          ].map((d) => (
            <div key={d.t} className="border-t border-[hsl(var(--nl-forest)/0.3)] pt-5">
              <div className="nl-serif text-xl">{d.t}</div>
              <a href={`mailto:${d.e}`} className="text-sm text-[hsl(var(--nl-forest))] mt-2 inline-block">{d.e}</a>
              <div className="text-xs text-[hsl(var(--nl-ink)/0.7)] mt-2">{d.d}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <CTA
          title="Want to become a JAGAA partner?"
          copy="Use our partnership form so we can match you with the right coordinator immediately."
          primary={{ label: "Partner with us", to: "/natural-living/partner" }}
        />
      </Section>
    </NLLayout>
  );
}
