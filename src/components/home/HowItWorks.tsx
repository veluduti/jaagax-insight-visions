import { motion } from "framer-motion";
import { Target, Search, ClipboardList, CalendarDays, Smile, ArrowRight, MoveDownRight } from "lucide-react";

const STEPS = [
  { icon: Target, title: "Tell Your Purpose", desc: "Choose what brings you to Jaaga", tone: "bg-emerald-500/10 text-emerald-600" },
  { icon: Search, title: "Search", desc: "Find the best options based on your needs", tone: "bg-blue-500/10 text-blue-600" },
  { icon: ClipboardList, title: "Compare", desc: "Explore and compare with AI insights", tone: "bg-indigo-500/10 text-indigo-600" },
  { icon: CalendarDays, title: "Connect & Book", desc: "Talk to agents or book securely", tone: "bg-purple-500/10 text-purple-600" },
  { icon: Smile, title: "Enjoy", desc: "Your dream place with complete support", tone: "bg-emerald-500/10 text-emerald-600" },
];

const HowItWorks = () => (
  <section className="section-spacing">
    <div className="container mx-auto container-padding">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">How Jaaga Works</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Simple, transparent and designed for everyone
          </p>
        </div>
        <p className="hidden md:block shrink-0 text-right font-script -rotate-6 text-lg lg:text-xl text-foreground/80 leading-snug">
          From Search
          <br />
          to a Better Tomorrow
          <MoveDownRight className="ml-auto mt-1 h-5 w-5 text-primary" />
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
              className="relative flex items-start gap-3 pr-4"
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${s.tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                {i + 1}. {s.title}
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-snug">{s.desc}</p>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight className="hidden lg:block absolute right-0 top-4 h-4 w-4 text-muted-foreground z-10" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default HowItWorks;
