import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Film, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import PropertyReelCard from "@/components/reels/PropertyReelCard";
import ReelPropertyDrawer from "@/components/reels/ReelPropertyDrawer";

interface Property {
  id: string;
  title: string;
  city: string;
  locality: string;
  price: number;
  bhk: number | null;
  type: string | null;
  verified: boolean | null;
  video_urls: string[];
  images: string[] | null;
  description: string | null;
  area_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  address: string | null;
}

// Property-tour style YouTube Shorts (real-estate / home walkthroughs)
const PROPERTY_REELS = [
  "https://www.youtube.com/shorts/3v-yqmehjGE",
  "https://www.youtube.com/shorts/8wzIyiHwScE",
  "https://www.youtube.com/shorts/Yx6UgfQreYY",
  "https://www.youtube.com/shorts/GgnClrx8N2k",
  "https://www.youtube.com/shorts/qg__8GAVcrs",
  "https://www.youtube.com/shorts/E7wJTI-1dvQ",
  "https://www.youtube.com/shorts/8a2RrZmUmbQ",
  "https://www.youtube.com/shorts/oBgi_DbyAtM",
  "https://www.youtube.com/shorts/xkV0Sb9Ftvo",
  "https://www.youtube.com/shorts/ulOu7B2tlWQ",
  "https://www.youtube.com/shorts/jL8x2gqBfKA",
  "https://www.youtube.com/shorts/X0tOpBuYasI",
  "https://www.youtube.com/shorts/oP8KbtbKAFo",
  "https://www.youtube.com/shorts/u4aBSPdVKUo",
  "https://www.youtube.com/shorts/NV0qaiTAZ_w",
];

const Promotions = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"details" | "book">("details");

  useEffect(() => {
    const fetchProperties = async () => {
      // Pull verified properties first, fall back to any if not enough.
      const { data: verified } = await supabase
        .from("properties")
        .select("*")
        .eq("verified", true)
        .limit(15);

      let pool: any[] = verified || [];
      if (pool.length < 15) {
        const { data: extra } = await supabase
          .from("properties")
          .select("*")
          .limit(15 - pool.length);
        const ids = new Set(pool.map((p) => p.id));
        pool = [...pool, ...(extra || []).filter((p) => !ids.has(p.id))];
      }

      const reels: Property[] = pool.slice(0, 15).map((p: any, i: number) => {
        const existing = Array.isArray(p.video_urls) ? p.video_urls.filter(Boolean) : [];
        const videos = existing.length > 0 ? existing : [PROPERTY_REELS[i % PROPERTY_REELS.length]];
        return {
          ...p,
          video_urls: videos as string[],
          images: p.images as string[] | null,
        };
      });

      setProperties(reels);
      setLoading(false);
    };
    fetchProperties();
  }, []);

  // Track current reel based on scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const idx = Math.round(container.scrollTop / container.clientHeight);
      if (idx !== currentIndex) setCurrentIndex(idx);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [currentIndex]);

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <Sparkles className="h-12 w-12 text-primary animate-pulse" />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white gap-4 px-4">
        <Film className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">No Property Reels Yet</h2>
        <p className="text-white/60 text-sm text-center max-w-sm">
          Add a property to start showcasing it as a promotion reel.
        </p>
        <Button variant="outline" onClick={() => navigate(-1)} className="text-white border-white/20">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black relative overflow-hidden">
      {/* Back button (fixed overlay) */}
      <div className="absolute top-4 left-4 z-30">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-white hover:bg-white/20 bg-black/30 backdrop-blur-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Title (fixed overlay) */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-white font-bold text-sm">Promotions</span>
      </div>

      {/* Counter (fixed overlay) */}
      <div className="absolute top-5 right-4 z-30 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full">
        <span className="text-white/90 text-xs font-medium">
          {currentIndex + 1} / {properties.length}
        </span>
      </div>

      {/* Vertical scroll-snap reels feed */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {properties.map((property, idx) => (
          <div
            key={property.id}
            className="h-screen w-full snap-start snap-always relative"
          >
            <PropertyReelCard
              property={property}
              isActive={idx === currentIndex}
              onViewDetails={() => {
                setDrawerTab("details");
                setDrawerOpen(true);
              }}
              onBookVisit={() => {
                setDrawerTab("book");
                setDrawerOpen(true);
              }}
            />
          </div>
        ))}
      </div>

      {/* Swipe-up hint on first reel */}
      {currentIndex === 0 && properties.length > 1 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 text-white/70 text-xs flex flex-col items-center gap-1 animate-bounce pointer-events-none">
          <span>Swipe up for more</span>
          <span className="text-base">↑</span>
        </div>
      )}

      {/* Property drawer */}
      <ReelPropertyDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        property={properties[currentIndex]}
        activeTab={drawerTab}
      />
    </div>
  );
};

export default Promotions;
