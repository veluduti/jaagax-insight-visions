import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import heroImage from "@/assets/home-hero-resort.jpg";
import HeroSearchPanel from "@/components/home/HeroSearchPanel";

interface HeroProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  showSearchBar?: boolean;
}

/**
 * Homepage hero — premium resort banner with the "What brings you to Jaaga
 * today?" discovery panel, matching the reference design.
 */
const Hero = ({ showSearchBar = true }: HeroProps) => {
  return (
    <div className="relative overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Luxury resort at sunset"
          className="h-full w-full object-cover"
          width={1920}
          height={1088}
          fetchPriority="high"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="relative z-10 container mx-auto container-padding pt-10 sm:pt-16 lg:pt-24 pb-8">
        <div className="max-w-7xl 3xl:max-w-[1680px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-12">
            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex-1 text-center lg:text-left"
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/25 backdrop-blur-sm px-4 py-1.5 text-xs sm:text-sm font-medium text-white">
                <Sparkles className="h-3.5 w-3.5 text-accent-neon" />
                India's First AI-Powered Property, Stays & Travel Platform
              </span>
              <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.05] text-white drop-shadow-lg">
                Make Every
                <br />
                Place <span className="text-accent-neon">Yours</span>
              </h1>
              <p className="mt-4 text-sm sm:text-base lg:text-lg text-white/85 max-w-xl mx-auto lg:mx-0 drop-shadow">
                Homes to live · Stays to explore · Experiences to remember
                <br />
                Investments for a brighter tomorrow.
              </p>
            </motion.div>

            {/* Script accent — desktop only */}
            <motion.p
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="hidden lg:block shrink-0 pt-6 text-right font-secondary italic text-2xl xl:text-3xl text-white/90 leading-snug drop-shadow"
            >
              More Than a Stay,
              <br />
              <span className="text-accent-neon not-italic font-semibold">A Better Tomorrow</span>
            </motion.p>
          </div>

          {/* Discovery panel */}
          {showSearchBar && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-8 lg:mt-12"
            >
              <HeroSearchPanel />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Hero;
