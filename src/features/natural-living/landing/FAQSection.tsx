import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const FAQ_ITEMS = [
  {
    q: "What exactly is Natural Living on JAAGAX?",
    a: "A guided ecosystem to help you find land, farms, villages, retreats or communities that fit your lifestyle intent — from weekend farming to retirement to land investment.",
  },
  {
    q: "Do I have to buy land to be part of it?",
    a: "No. Many journeys begin with a farm stay, a course, a community visit, or a shared cooperative. Land ownership is one path, not the only one.",
  },
  {
    q: "How does the AI companion work?",
    a: "It asks a series of adaptive questions to understand your goals, budget, region and readiness — then curates lands, mentors and next steps just for you.",
  },
  {
    q: "Is the land verified and legally clean?",
    a: "Every listed land goes through JAAGAX verification — legal title, on-ground checks, and agent verification — before it's marked verified.",
  },
  {
    q: "Where does JAAGAX Natural Living currently operate?",
    a: "We're active across South India (Telangana, Andhra Pradesh, Karnataka, Tamil Nadu) with expansion into other states in progress.",
  },
];

export default function FAQSection() {
  return (
    <section
      className="py-20 md:py-28"
      style={{ background: "hsl(var(--nl-cream-deep))" }}
      aria-labelledby="faq-h"
    >
      <div className="nl-container max-w-4xl">
        <div className="mb-10">
          <div className="nl-eyebrow mb-4">Frequently Asked</div>
          <h2 id="faq-h" className="nl-serif text-3xl md:text-5xl leading-[1.05] text-[hsl(var(--nl-ink))]">
            Answers, before you ask.
          </h2>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {FAQ_ITEMS.map((it, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-[hsl(var(--nl-ink)/0.1)]">
              <AccordionTrigger className="text-left text-base md:text-lg font-medium text-[hsl(var(--nl-ink))] hover:no-underline">
                {it.q}
              </AccordionTrigger>
              <AccordionContent className="text-[hsl(var(--nl-ink)/0.72)] text-sm md:text-base leading-relaxed">
                {it.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
