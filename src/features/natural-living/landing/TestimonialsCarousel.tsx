import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

const T = [
  {
    quote:
      "I moved back after 14 years abroad. JAAGAX helped me buy 3 acres, meet the village, and start again — without middlemen.",
    name: "Ramesh K.",
    role: "Returnee · Chittoor",
  },
  {
    quote:
      "The AI companion actually understood what I wanted — a weekend farmhouse, not a resort. I found the right land in 3 weeks.",
    name: "Sneha & Arjun",
    role: "Weekend farmers · Bengaluru",
  },
  {
    quote:
      "I invested in managed farmland. Quarterly reports, real produce, real people. It doesn't feel like an investment — it feels like belonging.",
    name: "Vikas M.",
    role: "Passive investor · Hyderabad",
  },
];

export default function TestimonialsCarousel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % T.length), 6000);
    return () => clearInterval(t);
  }, []);
  const t = T[i];
  return (
    <section
      className="py-20 md:py-28"
      style={{ background: "hsl(var(--nl-cream))" }}
      aria-labelledby="test-h"
    >
      <div className="nl-container">
        <div className="max-w-2xl mb-10">
          <div className="nl-eyebrow mb-4">Journeys So Far</div>
          <h2 id="test-h" className="nl-serif text-3xl md:text-5xl leading-[1.05] text-[hsl(var(--nl-ink))]">
            Real people. Real land. Real change.
          </h2>
        </div>

        <div className="relative rounded-2xl border border-[hsl(var(--nl-ink)/0.08)] bg-[hsl(var(--nl-cream-deep))] p-8 md:p-14">
          <Quote className="h-8 w-8 text-[hsl(var(--primary))] mb-6" />
          <blockquote
            key={i}
            className="nl-serif text-2xl md:text-4xl leading-[1.25] text-[hsl(var(--nl-ink))] animate-fade-in"
          >
            "{t.quote}"
          </blockquote>
          <div className="mt-8 flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-[hsl(var(--nl-ink))]">{t.name}</div>
              <div className="text-sm text-[hsl(var(--nl-ink)/0.6)]">{t.role}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                aria-label="Previous testimonial"
                onClick={() => setI((p) => (p - 1 + T.length) % T.length)}
                className="w-10 h-10 rounded-full border border-[hsl(var(--nl-ink)/0.15)] flex items-center justify-center hover:bg-[hsl(var(--nl-ink)/0.05)]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                aria-label="Next testimonial"
                onClick={() => setI((p) => (p + 1) % T.length)}
                className="w-10 h-10 rounded-full border border-[hsl(var(--nl-ink)/0.15)] flex items-center justify-center hover:bg-[hsl(var(--nl-ink)/0.05)]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-6 flex gap-1.5">
            {T.map((_, k) => (
              <button
                key={k}
                aria-label={`Go to testimonial ${k + 1}`}
                onClick={() => setI(k)}
                className={`h-1.5 rounded-full transition-all ${
                  k === i ? "w-8 bg-[hsl(var(--primary))]" : "w-4 bg-[hsl(var(--nl-ink)/0.15)]"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
