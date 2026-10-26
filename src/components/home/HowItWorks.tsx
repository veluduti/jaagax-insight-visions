import { motion } from "framer-motion";
import { ClipboardList, Search, GitCompareArrows, CalendarCheck, Smile, ArrowRight } from "lucide-react";

const STEPS = [
  { icon: ClipboardList, title: "Tell Your Purpose", desc: "Choose what brings you to Jaaga" },
  { icon: Search, title: "Search", desc: "Find the best options based on your needs" },
  { icon: GitCompareArrows, title: "Compare", desc: "Explore and compare with AI insights" },
  { icon: CalendarCheck, title: "Connect & Book", desc: "Talk to agents or book securely" },
  { icon: Smile, title: "Enjoy", desc: "Your dream place with complete support" },
];

const HowItWorks = () => (
  <section className="section-spacing">
    <div className="container mx-auto container-padding">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">How Jaaga Works</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Simple, transparent and designed for everyone
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="relative rounded-2xl border border-border/60 bg-card p-5 shadow-card hover:shadow-card-hover transition-shadow"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-bold text-muted-foreground">Step {i + 1}</span>
              </div>
              <h3 className="mt-3 text-base font-bold text-foreground">{s.title}</h3>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-snug">{s.desc}</p>
              {i < STEPS.length - 1 && (
                <ArrowRight className="hidden lg:block absolute -right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/50 z-10" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default HowItWorks;
