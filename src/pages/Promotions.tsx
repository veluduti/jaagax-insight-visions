import { useState, useEffect, useRef } from "react";
import { getPublicPropertyView } from "@/lib/publicPropertyView";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Film, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import PropertyReelCard from "@/components/reels/PropertyReelCard";
import { useLocation as useLocationContext } from "@/contexts/LocationContext";
import { getCityAliases, isSameCity } from "@/lib/cityNormalizer";

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
}

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
  const { savedLocation } = useLocationContext();
  const selectedCity = savedLocation?.city || "";
  const containerRef = useRef<HTMLDivElement>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      let q: any = supabase.from("properties").select("*").eq("verified", true);
      if (selectedCity) {
        q = q.in("city", getCityAliases(selectedCity));
      }
      const { data: verified } = await q.limit(40);

      const pool: any[] = verified || [];

      const reels: Property[] = pool.slice(0, 15).map((p: any, i: number) => {
        const v = getPublicPropertyView(p);
        const merged: any = v ? { ...p, title: v.title, city: v.city ?? p.city, locality: v.locality ?? p.locality, price: v.price ?? p.price, images: (v.images?.length ? v.images : p.images), video_urls: (v.video_urls?.length ? v.video_urls : p.video_urls) } : p;
        const existing = Array.isArray(merged.video_urls) ? merged.video_urls.filter(Boolean) : [];
        const videos = existing.length > 0 ? existing : [PROPERTY_REELS[i % PROPERTY_REELS.length]];
        return {
          ...merged,
          video_urls: videos as string[],
          images: merged.images as string[] | null,
        };
      }).filter((p: any) => !selectedCity || isSameCity(p.city, selectedCity));

      console.log("[Promotions] Selected city:", selectedCity, "Filtered:", reels.length);
      setProperties(reels);
      setLoading(false);
    };
    fetchProperties();
  }, [selectedCity]);

  // Track active reel using IntersectionObserver for accuracy
  useEffect(() => {
    const container = containerRef.current;
    if (!container || properties.length === 0) return;

    const reelEls = container.querySelectorAll<HTMLDivElement>("[data-reel-index]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = Number((entry.target as HTMLElement).dataset.reelIndex);
            setCurrentIndex(idx);
          }
        });
      },
      { root: container, threshold: [0.6] }
    );
    reelEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [properties.length]);

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
    <div className="min-h-screen w-full bg-neutral-950 relative flex items-center justify-center py-4 sm:py-6">
      {/* Back button (fixed overlay) */}
      <div className="fixed top-4 left-4 z-40">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-white hover:bg-white/20 bg-black/40 backdrop-blur-sm rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Title */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-white font-bold text-sm">Promotions</span>
      </div>

      {/* Counter */}
      <div className="fixed top-5 right-4 z-40 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
        <span className="text-white/90 text-xs font-medium">
          {currentIndex + 1} / {properties.length}
        </span>
      </div>

      {/* Centered mobile-style reel container */}
      <div
        ref={containerRef}
        className="relative w-full max-w-[420px] h-[90vh] overflow-y-scroll snap-y snap-mandatory rounded-2xl shadow-2xl bg-black scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {properties.map((property, idx) => (
          <div
            key={property.id}
            data-reel-index={idx}
            className="h-[90vh] w-full snap-start snap-always relative"
          >
            <PropertyReelCard
              property={property}
              isActive={idx === currentIndex}
              onVisit={() => navigate(`/property/${property.id}`)}
            />
          </div>
        ))}

        {/* Swipe-up hint on first reel */}
        {currentIndex === 0 && properties.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 text-white/70 text-[11px] flex flex-col items-center gap-0.5 animate-bounce pointer-events-none">
            <span>Swipe up</span>
            <span className="text-base leading-none">↑</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Promotions;
