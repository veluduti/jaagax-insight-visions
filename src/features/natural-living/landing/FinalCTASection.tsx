import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { logLandingSignal } from "./useLandingData";

export default function FinalCTASection() {
  return (
    <section
      className="py-24 md:py-32 relative overflow-hidden"
      style={{ background: "hsl(var(--nl-forest, var(--nl-ink)))", color: "hsl(var(--nl-cream))" }}
      aria-labelledby="final-h"
    >
      <div className="nl-container text-center max-w-3xl">
        <div className="nl-eyebrow mb-5" style={{ color: "hsl(var(--nl-cream)/0.7)" }}>
          Your Journey Starts Here
        </div>
        <h2 id="final-h" className="nl-serif text-4xl md:text-6xl leading-[1.02] tracking-tight">
          The land is <em className="italic">waiting</em>.<br />So is the life you actually want.
        </h2>
        <p className="mt-6 md:mt-8 text-base md:text-lg text-[hsl(var(--nl-cream)/0.8)]">
          Let our AI companion guide you to the right land, community and path — in minutes.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/natural-living/goals"
            onClick={() => logLandingSignal("cta_click", { section: "final", metadata: { cta: "primary" } })}
            className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--nl-cream))] text-[hsl(var(--nl-ink))] px-7 py-3.5 text-sm md:text-base font-medium hover:scale-[1.03] transition-transform"
          >
            Begin Your Journey
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/natural-living/lands"
            onClick={() => logLandingSignal("cta_click", { section: "final", metadata: { cta: "secondary" } })}
            className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--nl-cream)/0.4)] px-7 py-3.5 text-sm md:text-base font-medium hover:bg-[hsl(var(--nl-cream)/0.1)] transition-colors"
          >
            Browse Lands
          </Link>
        </div>
      </div>
    </section>
  );
}
