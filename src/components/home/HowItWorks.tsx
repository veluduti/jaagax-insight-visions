import { Fragment } from "react";
import { motion } from "framer-motion";
import { Target, Search, ClipboardList, CalendarDays, Smile, ArrowRight, MoveDownLeft } from "lucide-react";

const STEPS = [
  { icon: Target, title: "Tell Your Purpose", desc: "Choose what brings you to Jaaga", tone: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/15" },
  { icon: Search, title: "Search", desc: "Find the best options based on your needs", tone: "bg-blue-500/10 text-blue-600 ring-blue-500/15" },
  { icon: ClipboardList, title: "Compare", desc: "Explore and compare with AI insights", tone: "bg-blue-500/10 text-blue-600 ring-blue-500/15" },
  { icon: CalendarDays, title: "Connect & Book", desc: "Talk to agents or book securely", tone: "bg-purple-500/10 text-purple-600 ring-purple-500/15" },
  { icon: Smile, title: "Enjoy", desc: "Your dream place with complete support", tone: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/15" },
];

const HowItWorks = () => (
  <section className="py-6 sm:py-8">
    <div className="container mx-auto container-padding">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">How Jaaga Works</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Simple, transparent and designed for everyone</p>
        </div>
        <div className="hidden md:block shrink-0 -rotate-6 text-right font-script text-base lg:text-lg text-foreground/80 leading-tight">
          From Search
          <br />
          <span className="pl-4">to a Better Tomorrow</span>
          <MoveDownLeft className="ml-auto mr-6 mt-1 h-5 w-5 text-foreground/70" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 lg:flex lg:items-start lg:gap-3">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <Fragment key={s.title}>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="flex items-start gap-3 lg:flex-1 lg:min-w-0"
              >
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ring-4 ${s.tone}`}>
                  <Icon className="h-6 w-6" strokeWidth={2.4} />
                </span>
                <div className="pt-1">
                  <h3 className="text-sm sm:text-[15px] font-bold text-foreground">
                    {i + 1}. {s.title}
                  </h3>
                  <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground leading-snug">{s.desc}</p>
                </div>
              </motion.div>
              {i < STEPS.length - 1 && (
                <ArrowRight className="hidden lg:block mt-5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  </section>
);

export default HowItWorks;
