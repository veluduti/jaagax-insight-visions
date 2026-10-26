import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plane, Home, ArrowRight } from "lucide-react";
import exploreSmartStays from "@/assets/explore-smart-stays.jpg";
import exploreInvest from "@/assets/explore-invest.jpg";

const BANNERS = [
  {
    icon: Plane,
    title: "Plan Your Next Journey",
    highlight: "with Smart Stays",
    desc: "Hotel stays, travel packages, multi-city trips and unique experiences.",
    cta: "Explore Smart Stays",
    path: "/smart-stays",
    image: exploreSmartStays,
  },
  {
    icon: Home,
    title: "Find Your Dream Property",
    highlight: "",
    desc: "Verified homes, plots, commercial spaces and premium investment opportunities.",
    cta: "Explore Properties",
    path: "/search",
    image: exploreInvest,
  },
];

const JourneyBanners = () => (
  <section className="section-spacing">
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
              className="relative overflow-hidden rounded-3xl min-h-[260px] sm:min-h-[300px] flex"
            >
              <img
                src={b.image}
                alt=""
                loading="lazy"
                width={944}
                height={704}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/10" />
              <div className="relative z-10 flex flex-col justify-center p-6 sm:p-8 max-w-md">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                  {b.title}
                  {b.highlight && (
                    <>
                      {" "}
                      <span className="text-primary-light">{b.highlight}</span>
                    </>
                  )}
                </h3>
                <p className="mt-2 text-sm sm:text-base text-white/85">{b.desc}</p>
                <Link
                  to={b.path}
                  className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary-dark transition-colors"
                >
                  {b.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default JourneyBanners;
