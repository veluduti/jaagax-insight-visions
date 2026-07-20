import { useLandingSignals } from "./useLandingData";

function fmt(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K";
  return n.toString();
}

export default function SignalsSection() {
  const s = useLandingSignals();
  const items = [
    { label: "Journey seekers", value: fmt(s.users) + "+" },
    { label: "Active journeys", value: fmt(s.activeJourneys) + "+" },
    { label: "Lands available", value: fmt(s.availableLands) + "+" },
    { label: "Communities", value: fmt(s.communities) + "+" },
  ];
  return (
    <section
      className="py-16 md:py-20 border-y border-[hsl(var(--nl-ink)/0.08)]"
      style={{ background: "hsl(var(--nl-cream))" }}
      aria-label="Live platform signals"
    >
      <div className="nl-container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6">
          {items.map((it) => (
            <div key={it.label} className="text-center md:text-left">
              <div className="nl-serif text-4xl md:text-6xl leading-none text-[hsl(var(--nl-ink))]">
                {it.value}
              </div>
              <div className="mt-2 text-xs md:text-sm uppercase tracking-widest text-[hsl(var(--nl-ink)/0.55)]">
                {it.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
