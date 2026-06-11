import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Hero from "./Hero";
import ClientBannerHero from "./ClientBannerHero";

interface HeroCarouselProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  showSearchBar?: boolean;
  /** Autoplay delay in ms (default 5000). */
  interval?: number;
}

/**
 * 2-slide rotating hero:
 *   Slide 0 — client-approved banner (ClientBannerHero)
 *   Slide 1 — existing JAAGA hero (Hero), untouched
 *
 * - Loads with slide 0 visible.
 * - Auto-rotates every `interval` ms with a smooth crossfade.
 * - Pauses on hover/focus and while the tab is hidden.
 * - Dot indicators allow manual selection without disabling autoplay.
 */
const HeroCarousel = ({ activeTab, onTabChange, showSearchBar = true, interval = 5000 }: HeroCarouselProps) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const slides = [
    <ClientBannerHero
      key="client-banner"
      activeTab={activeTab}
      onTabChange={onTabChange}
      showSearchBar={showSearchBar}
    />,
    <Hero key="jaaga-hero" activeTab={activeTab} onTabChange={onTabChange} showSearchBar={showSearchBar} />,
  ];

  // Pause autoplay when the browser tab is hidden
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, interval);
    return () => window.clearInterval(id);
  }, [paused, interval, slides.length]);

  const goto = useCallback((i: number) => setIndex(((i % slides.length) + slides.length) % slides.length), [slides.length]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured hero"
      className="relative isolate"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            role="group"
            aria-roledescription="slide"
            aria-label={`Slide ${index + 1} of ${slides.length}`}
          >
            {slides[index]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goto(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              i === index ? "w-8 bg-primary shadow-glow" : "w-2.5 bg-foreground/30 hover:bg-foreground/50"
            }`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroCarousel;
