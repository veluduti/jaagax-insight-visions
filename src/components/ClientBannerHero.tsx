import { motion } from "framer-motion";
import PropertySearchBar from "./PropertySearchBar";
import bannerAsset from "@/assets/client-hero-banner.png.asset.json";

interface ClientBannerHeroProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  showSearchBar?: boolean;
}

/**
 * Slide 1 of the hero carousel — client-approved banner design.
 *
 * Renders the approved artwork as a full-bleed background and overlays
 * the EXISTING, fully-functional PropertySearchBar (same component used
 * by the standard hero) in the search-widget area shown in the design.
 * No search logic, autocomplete, or navigation is duplicated.
 */
const ClientBannerHero = ({ activeTab, onTabChange, showSearchBar = true }: ClientBannerHeroProps) => {
  return (
    <div className="relative w-full overflow-hidden bg-background">
      {/* ===== Desktop / tablet (≥ md): preserve banner aspect ratio, overlay search ===== */}
      <div className="hidden md:block relative w-full" style={{ aspectRatio: "16 / 9" }}>
        <img
          src={bannerAsset.url}
          alt="Your Dream Place Awaits — JAAGA X verified properties, AI insights, zero hidden costs"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover object-center select-none"
          draggable={false}
        />

        {/* Functional search overlay — positioned over the white pill in the artwork */}
        {showSearchBar && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="absolute left-1/2 -translate-x-1/2 w-[58%] max-w-[860px]"
            style={{ top: "48%" }}
          >
            <div className="rounded-2xl bg-white/0 backdrop-blur-[1px]">
              <PropertySearchBar activeTab={activeTab} onTabChange={onTabChange} />
            </div>
          </motion.div>
        )}
      </div>

      {/* ===== Mobile (< md): banner on top, functional search stacked below ===== */}
      <div className="md:hidden">
        <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
          <img
            src={bannerAsset.url}
            alt="Your Dream Place Awaits — JAAGA X"
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 w-full h-full object-cover object-center"
            draggable={false}
          />
        </div>
        {showSearchBar && (
          <div className="px-4 py-5 bg-background">
            <PropertySearchBar activeTab={activeTab} onTabChange={onTabChange} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientBannerHero;
