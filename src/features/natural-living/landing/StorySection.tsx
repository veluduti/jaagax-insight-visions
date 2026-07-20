import { Building2, Wind, Sprout, Sparkles } from "lucide-react";

const STEPS = [
  { icon: Building2, title: "Modern Life", body: "Cities, screens, deadlines. Convenient — but disconnected from soil, seasons, and people." },
  { icon: Wind, title: "The Pause", body: "A quiet question begins to surface. What if life could feel slower, rooted, real?" },
  { icon: Sprout, title: "Return To Roots", body: "You start exploring — land, farms, communities, weekend escapes. Small steps, real change." },
  { icon: Sparkles, title: "A New Way of Living", body: "You find your version of Natural Living. Investment, farming, retirement, or a weekend home." },
];

export default function StorySection() {
  return (
    <section id="story" className="py-20 md:py-28" style={{ background: "hsl(var(--nl-cream))" }} aria-labelledby="story-h">
      <div className="nl-container">
        <div className="max-w-2xl mb-14 md:mb-20">
          <div className="nl-eyebrow mb-4">The Journey</div>
          <h2 id="story-h" className="nl-serif text-3xl md:text-5xl leading-[1.05] tracking-tight text-[hsl(var(--nl-ink))]">
            From modern life to <em className="italic">natural living</em>.
          </h2>
          <p className="mt-5 text-base md:text-lg text-[hsl(var(--nl-ink)/0.72)]">
            Every journey looks different. But the shape of it is often the same.
          </p>
        </div>

        <ol className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-4 relative">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li
                key={s.title}
                className="relative rounded-2xl p-6 md:p-8 border border-[hsl(var(--nl-ink)/0.08)] bg-[hsl(var(--nl-cream-deep))] hover:shadow-lg transition-shadow animate-fade-in"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="text-xs font-mono text-[hsl(var(--nl-ink)/0.4)] mb-4">0{i + 1}</div>
                <div className="w-11 h-11 rounded-full flex items-center justify-center mb-5 bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="nl-serif text-xl md:text-2xl text-[hsl(var(--nl-ink))]">{s.title}</h3>
                <p className="mt-3 text-sm md:text-base text-[hsl(var(--nl-ink)/0.7)] leading-relaxed">{s.body}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
