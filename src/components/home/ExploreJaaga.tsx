import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BedDouble, Plane, Home, Building2, Leaf, ArrowRight, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { useRef } from "react";
import exploreStays from "@/assets/explore-stays.jpg";
import exploreSmartStays from "@/assets/explore-smart-stays.jpg";
import exploreInvest from "@/assets/explore-invest.jpg";
import exploreProjects from "@/assets/explore-projects.jpg";
import exploreExperiences from "@/assets/explore-experiences.jpg";

const CATEGORIES = [
  {
    title: "Jaaga Stays",
    desc: "Hotels, resorts, service apartments, PGs & co-living",
    icon: BedDouble, tone: "text-blue-600",
    image: exploreStays,
    path: "/hotels",
  },
  {
    title: "Smart Stays",
    desc: "Multi-city trips, travel packages & smart planning",
    icon: Plane, tone: "text-blue-600",
    image: exploreSmartStays,
    path: "/smart-stays",
  },
  {
    title: "Buy, Rent & Invest",
    desc: "Homes, plots, commercial spaces & investment opportunities",
    icon: Home, tone: "text-emerald-600",
    image: exploreInvest,
    path: "/search",
  },
  {
    title: "New Projects",
    desc: "Upcoming projects, launches & exclusive deals",
    icon: Building2, tone: "text-indigo-600",
    image: exploreProjects,
    path: "/projects",
  },
  {
    title: "Experiences",
    desc: "Farm stays, wellness, nature trips & local experiences",
    icon: Leaf, tone: "text-emerald-600",
    image: exploreExperiences,
    path: "/communities",
  },
];

const ExploreJaaga = () => {
  const scroller = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: number) =>
    scroller.current?.scrollBy({ left: dir * 320, behavior: "smooth" });

  return (
    <section className="section-spacing">
      <div className="container mx-auto container-padding">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Explore Jaaga</h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Everything you need for a better life and smarter investments
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/services"
              className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => scrollBy(-1)}
              aria-label="Scroll categories left"
              className="hidden md:grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scrollBy(1)}
              aria-label="Scroll categories right"
              className="hidden md:grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={scroller}
          className="flex gap-4 sm:gap-5 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 pb-1"
        >
          {CATEGORIES.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.07, 0.35), duration: 0.45 }}
                className="snap-start shrink-0 w-[240px] sm:w-[260px] lg:w-auto lg:flex-1 lg:min-w-0"
              >
                <Link
                  to={c.path}
                  className="group block overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card hover:shadow-card-hover transition-all duration-300"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={c.image}
                      alt={c.title}
                      loading="lazy"
                      width={944}
                      height={704}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                    <span className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-card/90 backdrop-blur border border-border/40 shadow-sm">
                      <Heart className="h-4 w-4 text-foreground/70" />
                    </span>
                  </div>
                  <div className="relative flex gap-3 p-3 pt-0">
                    <span className={`relative -mt-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-card shadow-md ${c.tone}`}>
                      <Icon className="h-6 w-6" />
                    </span>
                    <div className="pt-2 min-w-0">
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      {c.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-snug">{c.desc}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ExploreJaaga;
