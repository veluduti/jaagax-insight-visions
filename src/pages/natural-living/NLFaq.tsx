import { useState } from "react";
import NLLayout from "@/features/natural-living/NLLayout";
import { PageHeader, Section, Eyebrow, CTA } from "@/features/natural-living/ui";
import { Plus, Minus } from "lucide-react";

const FAQS = [
  {
    q: "What exactly is JAGAA Natural Living?",
    a: "A community-owned ecosystem across organic farming, village tourism, farm stays and wellness. You can sponsor a farm plot, order produce with full traceability, stay in a village, book a wellness retreat, or run corporate/school programs — all with the same farmers, villages and coordinators.",
  },
  {
    q: "How is JAGAA different from other organic delivery apps?",
    a: "We are not a marketplace. Every farmer is named and KYC-verified, every plot is traceable, and 70%+ of every rupee goes to the farmer. There are no anonymous suppliers, no re-branded produce and no middleman grading.",
  },
  {
    q: "What is a Digital Farm?",
    a: "A subscription where you choose a state → district → village → farmer → plot → crop. You get weekly photo/video updates from the farmer, an AI-assisted growth dashboard, and the actual harvest delivered to you.",
  },
  {
    q: "Are the farm stays comfortable for city families?",
    a: "Yes. Every JAGAA stay meets a minimum standard: clean bedding, hot water, private bathroom, safe drinking water, insurance cover, and a local coordinator on WhatsApp. We offer village homes, luxury eco-stays, camping and tree houses.",
  },
  {
    q: "Can my company run CSR through JAGAA?",
    a: "Absolutely. We build CSR-grade programs: village adoption, tree plantation, employee farms, carbon offset, and organic office pantries — with third-party-auditable impact reports.",
  },
  {
    q: "How do you verify farmers and villages?",
    a: "Every farmer goes through KYC, land record verification and an on-ground visit by a village coordinator. Villages are approved by the JAGAA admin team before appearing publicly. Practices are re-audited every season.",
  },
  {
    q: "What happens if a crop fails or a delivery is late?",
    a: "JAGAA-run insurance covers crop failure for Digital Farm subscribers, and we refund or replace late/damaged deliveries. Real problems, handled by a real human, on WhatsApp.",
  },
  {
    q: "Is JAGAA available all across India?",
    a: "We currently operate in 148 villages across Karnataka, Kerala, Tamil Nadu, Andhra Pradesh, Maharashtra and Telangana. New states are added every quarter.",
  },
];

export default function NLFaq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <NLLayout>
      <PageHeader
        eyebrow="FAQ"
        title="Answers, without the marketing voice."
        lede="If your question isn't here, our team will answer it personally on WhatsApp within a day."
      />

      <Section>
        <div className="max-w-3xl">
          {FAQS.map((f, i) => (
            <div key={f.q} className="border-t border-[hsl(var(--nl-forest)/0.3)] last:border-b">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full py-6 flex items-start justify-between gap-6 text-left"
              >
                <span className="nl-serif text-xl md:text-2xl">{f.q}</span>
                <span className="mt-1 shrink-0 text-[hsl(var(--nl-forest))]">
                  {open === i ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </span>
              </button>
              {open === i && (
                <div className="pb-8 pr-10 text-[hsl(var(--nl-ink)/0.78)] leading-relaxed">{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section tone="sage">
        <CTA
          title="Still have a question?"
          copy="Reach us on WhatsApp — you'll speak to a real human, usually within an hour."
          primary={{ label: "Contact us", to: "/natural-living/contact" }}
        />
      </Section>
    </NLLayout>
  );
}
