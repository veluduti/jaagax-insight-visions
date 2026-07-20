import { Link } from "react-router-dom";
import { ArrowRight, PlayCircle } from "lucide-react";
import hero from "@/assets/nl-hero.jpg";
import { logLandingSignal } from "./useLandingData";

export default function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden" aria-label="Natural Living hero">
      <div className="relative h-[92vh] min-h-[600px] max-h-[900px]">
        <img
          src={hero}
          alt="Sunrise over an Indian farm — a life rooted in nature"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, hsl(var(--nl-ink) / 0.25) 0%, hsl(var(--nl-ink) / 0.35) 55%, hsl(var(--nl-ink) / 0.85) 100%)",
          }}
          aria-hidden
        />
        <div className="relative z-10 h-full flex items-end">
          <div className="nl-container pb-14 md:pb-24 text-[hsl(var(--nl-cream))] animate-fade-in">
            <div className="max-w-3xl">
              <div className="nl-eyebrow mb-5" style={{ color: "hsl(var(--nl-cream) / 0.9)" }}>
                Natural Living · Return To Roots
              </div>
              <h1 className="nl-serif text-4xl sm:text-6xl md:text-7xl xl:text-8xl leading-[0.98] tracking-tight">
                Find your <em className="italic">Natural Living</em> journey.
              </h1>
              <p className="mt-6 md:mt-8 max-w-xl text-base md:text-lg leading-relaxed text-[hsl(var(--nl-cream)/0.85)]">
                Land, farms, villages, retreats and communities — guided by an AI companion
                that helps you discover the life you actually want.
              </p>
              <div className="mt-8 md:mt-10 flex flex-wrap items-center gap-3 md:gap-4">
                <Link
                  to="/natural-living/goals"
                  onClick={() => logLandingSignal("cta_click", { section: "hero", metadata: { cta: "primary" } })}
                  className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--nl-cream))] text-[hsl(var(--nl-ink))] px-6 py-3 md:px-7 md:py-3.5 text-sm md:text-base font-medium hover:scale-[1.02] transition-transform shadow-lg"
                >
                  Begin Your Journey
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#story"
                  onClick={() => logLandingSignal("cta_click", { section: "hero", metadata: { cta: "secondary" } })}
                  className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--nl-cream)/0.5)] text-[hsl(var(--nl-cream))] px-6 py-3 md:px-7 md:py-3.5 text-sm md:text-base font-medium hover:bg-[hsl(var(--nl-cream)/0.1)] transition-colors"
                >
                  <PlayCircle className="h-4 w-4" />
                  Watch the Story
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
