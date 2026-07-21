import { Link } from "react-router-dom";
import NLLayout from "@/features/natural-living/NLLayout";
import { Section, Eyebrow, H1, H2, Lede, StatBlock, EditorialCard, CTA } from "@/features/natural-living/ui";
import { ArrowUpRight, Leaf, Sprout, TreePine, Users2, Home, Sun } from "lucide-react";
import hero from "@/assets/nl-hero.jpg";
import produce from "@/assets/nl-produce.jpg";
import hands from "@/assets/nl-hands.jpg";
import stay from "@/assets/nl-stay.jpg";

export default function NLHome() {
  return (
    <NLLayout>
      {/* HERO */}
      <section className="relative">
        <div className="relative h-[92vh] min-h-[620px] max-h-[900px] overflow-hidden">
          <img
            src={hero}
            alt="Woman farmer in a paddy field at sunrise"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, hsl(var(--nl-ink) / 0.15) 0%, hsl(var(--nl-ink) / 0.15) 50%, hsl(var(--nl-ink) / 0.6) 100%)",
            }}
          />
          <div className="absolute inset-0 flex items-end">
            <div className="nl-container pb-16 md:pb-24 text-[hsl(var(--nl-cream))]">
              <div className="max-w-3xl">
                <div className="nl-eyebrow mb-5" style={{ color: "hsl(var(--nl-cream) / 0.9)" }}>
                  Est. 2026 · India
                </div>
                <h1 className="nl-serif text-4xl sm:text-6xl md:text-8xl leading-[0.98] tracking-tight">
                  A quieter way to <em style={{ fontStyle: "italic" }}>live</em>,<br />
                  eat, and belong.
                </h1>
                <p className="mt-8 max-w-xl text-base md:text-lg leading-relaxed text-[hsl(var(--nl-cream)/0.85)]">
                  JAGAA Natural Living is a community-owned ecosystem of organic farms, villages,
                  wellness retreats and farm stays across India — built with farmers, land owners
                  and families who believe in slower, rooted living.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MANIFESTO STRIP */}
      <Section>
        <div className="grid md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-4">
            <Eyebrow>The Manifesto</Eyebrow>
            <div className="nl-rule mt-4 w-16" />
          </div>
          <div className="md:col-span-8">
            <p className="nl-serif text-2xl md:text-4xl leading-[1.25]">
              We are not a marketplace. We are a return.
              A return to soil that remembers our names, to food with a story,
              to villages that welcome strangers as guests, and to a slower pulse
              the body was always waiting for.
            </p>
            <p className="mt-8 text-[hsl(var(--nl-ink)/0.7)] max-w-xl leading-relaxed">
              Everything on JAGAA is grown, cooked, hosted, taught or shipped by real people —
              farmers, land owners, artisans, cooks, guides and village coordinators — who share
              in the value they create. No middlemen. No greenwashing. Just the land, and the
              hands that tend it.
            </p>
          </div>
        </div>
      </Section>

      {/* PILLARS */}
      <Section tone="sage" className="!py-24">
        <div className="grid md:grid-cols-3 gap-10">
          {[
            {
              icon: Sprout,
              eyebrow: "Volume I",
              title: "The Digital Farm",
              copy: "Sponsor a plot. Choose a crop. Watch it grow through weekly updates from a real farmer — and receive the harvest at your door.",
              to: "/natural-living/farms",
            },
            {
              icon: Home,
              eyebrow: "Volume II",
              title: "Village Stays",
              copy: "Sleep in a mud-plaster cottage under a tiled roof. Cook with the family. Walk the fields at dawn. Return home softer.",
              to: "/natural-living/farm-stay",
            },
            {
              icon: Leaf,
              eyebrow: "Volume III",
              title: "Living Wellness",
              copy: "Yoga at sunrise, an Ayurvedic meal at noon, a forest walk before dusk. Retreats built with the seasons, not the calendar.",
              to: "/natural-living/wellness",
            },
          ].map((p) => (
            <Link key={p.title} to={p.to} className="group block">
              <p.icon className="h-7 w-7 mb-6" style={{ color: "hsl(var(--nl-forest))" }} />
              <div className="nl-eyebrow mb-2">{p.eyebrow}</div>
              <h3 className="nl-serif text-2xl md:text-3xl mb-3 group-hover:text-[hsl(var(--nl-forest))] transition-colors">
                {p.title}
              </h3>
              <p className="text-[hsl(var(--nl-ink)/0.72)] leading-relaxed text-sm">{p.copy}</p>
              <div className="mt-5 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-[hsl(var(--nl-forest))]">
                Explore <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* EDITORIAL SPLIT — HANDS */}
      <Section>
        <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-center">
          <div className="md:col-span-6">
            <div className="overflow-hidden aspect-[4/5]">
              <img src={hands} alt="Farmer holding paddy seedlings" className="w-full h-full object-cover" loading="lazy" />
            </div>
          </div>
          <div className="md:col-span-6">
            <Eyebrow>Our people · Farmers</Eyebrow>
            <H2 className="mt-4">The farmer is the first citizen of this republic.</H2>
            <p className="mt-6 text-[hsl(var(--nl-ink)/0.75)] leading-relaxed">
              Every JAGAA farm is stewarded by a named farmer with a real story — decades of
              knowledge, a piece of land, and skin in the game. We give them tools to manage
              crops, direct access to customers, and a fair share of every rupee.
            </p>
            <p className="mt-4 text-[hsl(var(--nl-ink)/0.75)] leading-relaxed">
              No commission games. No opaque grading. Just a farmer, a customer, and a season
              of trust between them.
            </p>
            <Link to="/natural-living/farmers" className="nl-btn nl-btn-outline mt-8">
              Meet the farmers
            </Link>
          </div>
        </div>
      </Section>

      {/* IMPACT NUMBERS */}
      <Section tone="ink">
        <Eyebrow>
          <span style={{ color: "hsl(var(--nl-cream) / 0.75)" }}>Living Impact — as of this season</span>
        </Eyebrow>
        <h2 className="nl-serif text-3xl md:text-5xl mt-4 max-w-2xl" style={{ color: "hsl(var(--nl-cream))" }}>
          Numbers we watch, so the land can hear us listen.
        </h2>
        <div className="grid md:grid-cols-4 gap-10 mt-16">
          {[
            { n: "148", label: "Villages onboarded", sub: "Across 6 Indian states" },
            { n: "1,240", label: "Farmers supported", sub: "With direct customer access" },
            { n: "38,000+", label: "Organic meals served", sub: "Through stays & retreats" },
            { n: "2.4M kg", label: "Carbon offset", sub: "Via tree plantation programs" },
          ].map((s) => (
            <div key={s.label} className="border-t border-[hsl(var(--nl-cream)/0.25)] pt-5">
              <div className="nl-serif text-5xl md:text-6xl" style={{ color: "hsl(var(--nl-sage))" }}>
                {s.n}
              </div>
              <div className="mt-2 text-sm font-medium" style={{ color: "hsl(var(--nl-cream))" }}>
                {s.label}
              </div>
              <div className="text-xs mt-1" style={{ color: "hsl(var(--nl-cream) / 0.6)" }}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* STORY GRID — magazine */}
      <Section>
        <div className="flex items-end justify-between mb-12">
          <div>
            <Eyebrow>Field Notes · Journal</Eyebrow>
            <H2 className="mt-3">Dispatches from the fields.</H2>
          </div>
          <Link to="/natural-living/stories" className="hidden md:inline-flex items-center gap-1 text-sm text-[hsl(var(--nl-forest))]">
            All stories <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-10">
          <EditorialCard
            image={produce}
            eyebrow="Harvest · Karnataka"
            title="The red rice that took three generations to save."
            excerpt="A farmer, a lost seed, and a village that decided to grow it again — despite the market."
            to="/natural-living/stories"
          />
          <EditorialCard
            image={stay}
            eyebrow="Farm Stay · Coorg"
            title="Sleeping under a coffee canopy."
            excerpt="Two nights in a mud-and-tile cottage, one long dinner, and the sound of monsoon on terracotta."
            to="/natural-living/farm-stay"
          />
          <EditorialCard
            image={hands}
            eyebrow="Wellness · Kerala"
            title="A rhythm your body already knows."
            excerpt="Ayurvedic breakfasts, forest bathing, and the discipline of doing very little, very well."
            to="/natural-living/wellness"
          />
        </div>
      </Section>

      {/* PARTNER STRIP */}
      <Section tone="sage">
        <div className="grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-7">
            <Eyebrow>For Corporates & Schools</Eyebrow>
            <H2 className="mt-4 max-w-xl">
              Adopt a village. Plant a forest. Feed a company on food with a face.
            </H2>
            <p className="mt-6 text-[hsl(var(--nl-ink)/0.75)] leading-relaxed max-w-xl">
              JAGAA works with corporates on CSR-grade farm adoption, employee retreats,
              carbon-offset plantations, and organic office pantries — with real, auditable
              impact reports. Schools bring children onto the land through curriculum-linked
              village visits.
            </p>
          </div>
          <div className="md:col-span-5 flex flex-col gap-4">
            <Link to="/natural-living/corporate" className="nl-btn nl-btn-primary justify-between">
              Corporate programs <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link to="/natural-living/schools" className="nl-btn nl-btn-primary justify-between">
              School programs <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link to="/natural-living/partner" className="nl-btn nl-btn-outline justify-between">
              Talk to our team <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Section>

      {/* CTA */}
      <Section>
        <CTA
          title="Everything green starts with a single seed."
          copy="Sponsor a plot, book a stay, or bring your team into a village. We'll show you what a slower India looks like."
          primary={{ label: "Start with a plot", to: "/natural-living/farms" }}
          secondary={{ label: "Contact our team", to: "/natural-living/contact" }}
        />
      </Section>
    </NLLayout>
  );
}
