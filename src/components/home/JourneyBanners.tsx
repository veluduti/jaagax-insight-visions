import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plane, Home, ArrowRight } from "lucide-react";
import bannerSmartStays from "@/assets/banner-smart-stays.jpg";
import bannerProperty from "@/assets/banner-property.jpg";
import exploreStays from "@/assets/explore-stays.jpg";
import exploreSmartStays from "@/assets/explore-smart-stays.jpg";
import exploreExperiences from "@/assets/explore-experiences.jpg";

const BANNERS = [
  {
    icon: Plane,
    title: "Plan Your Next Journey",
    highlight: "with Smart Stays",
    desc: "Hotel stays, travel packages, multi-city trips and unique experiences.",
    cta: "Explore Smart Stays",
    path: "/smart-stays",
    image: bannerSmartStays,
    chips: [
      { label: "Multi-city Itineraries", image: exploreSmartStays },
      { label: "Curated Packages", image: exploreStays },
      { label: "Experiences & Activities", image: exploreExperiences },
    ],
  },
  {
    icon: Home,
    title: "Find Your Dream Property",
    highlight: "",
    desc: "Verified homes, plots, commercial spaces and premium investment opportunities.",
    cta: "Explore Properties",
    path: "/search",
    image: bannerProperty,
    chips: [],
  },
];

const JourneyBanners = () => (
  <section className="py-6 sm:py-8">
    <div className="container mx-auto container-padding">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {BANNERS.map((b, i) => {
          const Icon = b.icon;
          return (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-card min-h-[200px]"
            >
              <img
                src={b.image}
                alt=""
                loading="lazy"
                width={1600}
                height={640}
                className="absolute inset-0 h-full w-full object-cover object-right"
              />
              <div className="relative flex gap-4 p-5 sm:p-6 max-w-[62%] sm:max-w-[55%]">
                <span className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-card shadow-md text-primary">
                  <Icon className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight">
                    {b.title}
                    {b.highlight && (
                      <>
                        <br />
                        <span className="text-primary">{b.highlight}</span>
                      </>
                    )}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-foreground/70">{b.desc}</p>
                  <Link
                    to={b.path}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary-dark transition-colors"
                  >
                    {b.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
              {b.chips.length > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-2">
                  {b.chips.map((c) => (
                    <div key={c.label} className="flex items-center gap-2 rounded-lg bg-card/95 p-1 pl-2 shadow-md">
                      <span className="text-[10px] font-semibold text-foreground w-20 leading-tight">{c.label}</span>
                      <img src={c.image} alt="" loading="lazy" className="h-7 w-10 rounded object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default JourneyBanners;
