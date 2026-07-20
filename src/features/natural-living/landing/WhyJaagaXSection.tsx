import { Check, X } from "lucide-react";

const ROWS = [
  { feature: "AI-guided personal journey", jaagax: true, others: false },
  { feature: "Verified land with legal checks", jaagax: true, others: false },
  { feature: "Real farmers, real communities", jaagax: true, others: false },
  { feature: "Integrated visits, stays & retreats", jaagax: true, others: false },
  { feature: "Transparent pricing", jaagax: true, others: false },
  { feature: "One-off brokers & listings", jaagax: false, others: true },
];

export default function WhyJaagaXSection() {
  return (
    <section
      className="py-20 md:py-28"
      style={{ background: "hsl(var(--nl-cream-deep))" }}
      aria-labelledby="why-h"
    >
      <div className="nl-container">
        <div className="max-w-2xl mb-12 md:mb-16">
          <div className="nl-eyebrow mb-4">Why JAAGAX</div>
          <h2
            id="why-h"
            className="nl-serif text-3xl md:text-5xl leading-[1.05] tracking-tight text-[hsl(var(--nl-ink))]"
          >
            Not a listing site. A <em className="italic">life platform</em>.
          </h2>
        </div>

        <div className="rounded-2xl overflow-hidden border border-[hsl(var(--nl-ink)/0.08)] bg-[hsl(var(--nl-cream))]">
          <div className="grid grid-cols-[1fr_auto_auto] text-xs md:text-sm uppercase tracking-widest text-[hsl(var(--nl-ink)/0.5)] border-b border-[hsl(var(--nl-ink)/0.08)]">
            <div className="p-4 md:p-5">Feature</div>
            <div className="p-4 md:p-5 text-center min-w-[100px] font-medium text-[hsl(var(--primary))]">JAAGAX</div>
            <div className="p-4 md:p-5 text-center min-w-[100px]">Others</div>
          </div>
          {ROWS.map((r, i) => (
            <div
              key={r.feature}
              className={`grid grid-cols-[1fr_auto_auto] items-center text-sm md:text-base ${
                i % 2 === 1 ? "bg-[hsl(var(--nl-cream-deep)/0.4)]" : ""
              }`}
            >
              <div className="p-4 md:p-5 text-[hsl(var(--nl-ink))]">{r.feature}</div>
              <div className="p-4 md:p-5 text-center min-w-[100px]">
                {r.jaagax ? (
                  <Check className="inline h-5 w-5 text-[hsl(var(--primary))]" />
                ) : (
                  <X className="inline h-5 w-5 text-[hsl(var(--nl-ink)/0.3)]" />
                )}
              </div>
              <div className="p-4 md:p-5 text-center min-w-[100px]">
                {r.others ? (
                  <Check className="inline h-5 w-5 text-[hsl(var(--nl-ink)/0.4)]" />
                ) : (
                  <X className="inline h-5 w-5 text-[hsl(var(--nl-ink)/0.3)]" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
