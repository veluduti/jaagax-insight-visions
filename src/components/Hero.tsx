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
    <div className="relative z-20 xl:max-h-[calc(100vh-81px)] flex items-center">
      {/* Background image with overlay — overflow hidden here only, so
          popovers from the search panel are never clipped by the hero */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src={heroImage}
          alt="Luxury resort at sunset"
          className="h-full w-full object-cover"
          width={1920}
          height={832}
          decoding="async"
        />
        <div className="absolute inset-0 hero-blue-tint" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="relative z-10 w-full container mx-auto container-padding pt-4 sm:pt-6 lg:pt-6 pb-2">
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
              <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl xl:text-[56px] font-hero font-black leading-[1.0] tracking-tight text-white drop-shadow-lg">
                Make Every
                <br />
                Place <span className="text-accent-neon">Yours</span>
              </h1>
              <p className="mt-3 font-hero font-medium text-sm lg:text-base text-white max-w-xl mx-auto lg:mx-0 drop-shadow">
                Homes to live <span className="text-accent-neon mx-1.5">•</span> Stays to explore <span className="text-accent-neon mx-1.5">•</span> Experiences to remember
                <br />
                Investments for a brighter tomorrow.
              </p>
            </motion.div>

            {/* Script accent — desktop only */}
            <motion.p
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="hidden lg:block shrink-0 pt-2 pr-4 text-center font-script text-2xl xl:text-4xl text-white leading-tight drop-shadow -rotate-6"
            >
              More Than a Stay,
              <br />
              <span className="text-white">A Better Tomorrow</span>
              <span className="block mx-auto mt-1 h-1 w-40 rounded-full bg-accent-neon" />
            </motion.p>
          </div>

          {/* Discovery panel */}
          {showSearchBar && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-4 lg:mt-5"
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
