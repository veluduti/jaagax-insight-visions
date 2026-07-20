import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { useNLGoals, logLandingSignal } from "./useLandingData";

function iconFor(name: string | null) {
  if (!name) return Icons.Leaf;
  const key = name
    .split(/[-_ ]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
  const Comp = (Icons as any)[key] || (Icons as any)[name] || Icons.Leaf;
  return Comp;
}

export default function PillarsSection() {
  const { goals, loading } = useNLGoals();

  return (
    <section
      id="pillars"
      className="py-20 md:py-28"
      style={{ background: "hsl(var(--nl-cream-deep))" }}
      aria-labelledby="pillars-h"
    >
      <div className="nl-container">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 md:mb-16">
          <div className="max-w-2xl">
            <div className="nl-eyebrow mb-4">Natural Living Pillars</div>
            <h2
              id="pillars-h"
              className="nl-serif text-3xl md:text-5xl leading-[1.05] tracking-tight text-[hsl(var(--nl-ink))]"
            >
              Choose the shape of your <em className="italic">natural life</em>.
            </h2>
          </div>
          <p className="max-w-md text-[hsl(var(--nl-ink)/0.7)] text-sm md:text-base">
            Every pillar is a curated pathway — with land, guidance, community and tooling built for it.
          </p>
        </div>

        {loading ? (
          <div className="grid gap-5 md:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-56 rounded-2xl bg-[hsl(var(--nl-cream))] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 md:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {goals.map((g, i) => {
              const Icon = iconFor(g.icon);
              return (
                <Link
                  key={g.id}
                  to={`/natural-living/start?goal=${g.code}`}
                  onClick={() => logLandingSignal("goal_hover", { section: "pillars", goal_code: g.code })}
                  className="group relative rounded-2xl p-6 md:p-7 bg-[hsl(var(--nl-cream))] border border-[hsl(var(--nl-ink)/0.08)] hover:border-[hsl(var(--primary)/0.4)] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="nl-serif text-lg md:text-xl text-[hsl(var(--nl-ink))] leading-snug">
                    {g.title}
                  </h3>
                  {g.subtitle && (
                    <p className="mt-2 text-sm text-[hsl(var(--nl-ink)/0.65)] leading-relaxed line-clamp-2">
                      {g.subtitle}
                    </p>
                  )}
                  <ArrowUpRight className="absolute top-6 right-6 h-4 w-4 text-[hsl(var(--nl-ink)/0.3)] group-hover:text-[hsl(var(--primary))] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
